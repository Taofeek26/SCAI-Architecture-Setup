import { useEffect, useRef, useState, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import * as d3 from 'd3';
import './FlowBrain.css';

const FlowBrain = () => {
  const { isDataLoaded, architectureData, processData, cloudformationData } = useData();
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentBrainState, setCurrentBrainState] = useState('fixed'); // 'gap' or 'fixed'
  const [showResourceNodes, setShowResourceNodes] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const visualizationDataRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  // Debug: Log when selectedPhase changes
  useEffect(() => {
    console.log('%c=== SELECTED PHASE STATE CHANGED ===', 'background: #222; color: #bada55; font-size: 14px; font-weight: bold;');
    console.log('New selectedPhase value:', selectedPhase);
    if (selectedPhase) {
      console.log('Phase details:', {
        id: selectedPhase.id,
        name: selectedPhase.name,
        coverage: selectedPhase.coverage,
        grade: selectedPhase.grade,
        status: selectedPhase.status
      });
      console.log('Detail panel should be visible now');
    } else {
      console.log('No phase selected - detail panel showing placeholder');
    }
    console.log('%c=====================================', 'background: #222; color: #bada55;');
  }, [selectedPhase]);

  // Layer colors mapping
  const LAYER_COLORS = {
    '1': '#40EDC3', '2': '#7FFBA9', '3': '#D3F89A', '4': '#60D9F5',
    '5': '#FFB347', '6': '#FF6B9D', '7': '#B794F6', 'Unknown': '#9C9C9C'
  };

  // Helper function to check if resource is "new" (for gap analysis)
  const isNewResource = (processOrder) => {
    return processOrder < 1 ||
           (processOrder >= 3.9 && processOrder < 4) ||
           (processOrder >= 4.5 && processOrder < 5) ||
           (processOrder >= 5.5);
  };

  // Calculate grade from coverage percentage
  const getGradeFromCoverage = (coverage) => {
    if (coverage >= 98) return 'A+';
    if (coverage >= 90) return 'A';
    if (coverage >= 80) return 'B+';
    if (coverage >= 70) return 'B';
    if (coverage >= 60) return 'C';
    if (coverage >= 50) return 'D';
    return 'F';
  };

  // Get status from grade
  const getStatusFromGrade = (grade) => {
    if (grade === 'A+' || grade === 'A') return 'COMPLETE';
    if (grade === 'B+' || grade === 'B' || grade === 'C') return 'PARTIAL';
    if (grade === 'D') return 'PARTIAL';
    return 'CRITICAL';
  };

  // Calculate visible resource count for a phase based on current state
  const getVisibleResourceCount = (phase, state) => {
    if (!phase.resources) return 0;

    if (state === 'gap') {
      // In gap state, count only existing resources (exclude new ones)
      return phase.resources.filter(resource => !isNewResource(resource.processOrder)).length;
    } else {
      // In fix state, count all resources
      return phase.resources.length;
    }
  };

  // Calculate coverage percentage for a phase
  const calculateCoverage = (phase, state) => {
    const totalInFixState = phase.resources ? phase.resources.length : 0;
    if (totalInFixState === 0) return 0;

    if (state === 'gap') {
      const visibleCount = getVisibleResourceCount(phase, state);
      return Math.round((visibleCount / totalInFixState) * 100);
    } else {
      return 100; // Fix state always 100%
    }
  };

  // Transform data to neural flow
  const transformDataToNeuralFlow = (architectureData, processData) => {
    const processMap = processData.processMaps[0];
    const phaseMap = new Map();
    const allResources = [];

    processMap.resources.forEach(resource => {
      const processOrder = parseFloat(resource.processOrder);
      const phaseNum = Math.floor(processOrder);

      if (!phaseMap.has(phaseNum)) {
        phaseMap.set(phaseNum, []);
      }

      const serviceInfo = architectureData.services ? architectureData.services[resource.id] : null;
      const resourceType = serviceInfo ? serviceInfo.type : 'Unknown';
      const layer = serviceInfo ? serviceInfo.layer : 'Unknown';

      const enrichedResource = {
        ...resource,
        processOrder: processOrder,
        phaseNum: phaseNum,
        type: resourceType,
        layer: layer
      };

      phaseMap.get(phaseNum).push(enrichedResource);
      allResources.push(enrichedResource);
    });

    // Define phases with brain-lobe positions (coverage, grade, status calculated dynamically)
    const phases = [
      {
        id: 0,
        name: "Entry &\nValidation",
        description: "Entry point for all content generation requests",
        executionMode: "always-active",
        color: "#FFB347",
        fillPath: `M 63,220.5 C 70,224 77.6,220.5 87,220.5 C 87,220.5 94,192.5 107,175.5 C 112.7,168.1 123.5,163.1 116.5,157.5 C 109.5,151.9 107,125.5 107,125.5 L 113,82.5 C 113,82.5 113,60 107,47.5 C 101,35 94,35.5 94,35.5 C 94,35.5 78.8,41.7 70,47.5 C 61,53.5 49,65.5 49,65.5 C 49,65.5 34.5,71.5 30,82.5 C 25.5,93.5 15,107.5 15,107.5 C 15,107.5 4.2,134.9 7,152.5 C 9.3,166.5 12.3,175.2 22,185.5 C 24.9,188.5 30,192.5 30,192.5 C 30,192.5 42.2,199.6 49,205.5 C 55.1,210.8 56,217 63,220.5 Z`,
        labelPos: { x: -60, y: 130 },
        anchorPos: { x: 15, y: 135 },
        textAnchor: "end",
        position: { x: 150, y: 300 },
        size: { width: 200, height: 200 },
        resources: (phaseMap.get(0) || [])
      },
      {
        id: 1,
        name: "Keyword\nClustering",
        description: "AI-powered keyword expansion and clustering",
        executionMode: "sequential",
        color: "#7FFBA9",
        fillPath: `M 374,66 C 374,66 369.1,64.5 366,63.5 M 366,63.5 C 363.2,66.8 361.7,68.8 359.5,72.5 C 354.9,80.3 355,85.9 352,94.5 V 109.5 C 352,109.5 352,124.4 352,134 C 352,144.7 353.7,150.9 352,161.5 C 351.1,167.3 350.1,170.4 348.5,176 C 347.1,181.1 344.5,189 344.5,189 C 344.5,189 348,197 348.5,202.5 C 349.5,212.4 337,218.5 342,227 C 344.6,231.3 352,235 352,235 C 352,235 359.7,242.7 366,244.5 C 371.3,246 374.6,244.5 380,244.5 C 384.1,244.5 386.5,245.2 390.5,244.5 C 398.4,243.2 402,239.6 408.5,235 C 413.6,231.4 416.8,229.5 420.5,224.5 C 425.3,218 426.5,213 427.5,205 C 428.2,200.2 428.1,197.3 427.5,192.5 C 426.9,187.5 425.2,185 424.5,180 C 423.7,173.8 424.5,170.2 424.5,164 C 424.5,160.7 424.5,155.5 424.5,155.5 L 412.5,134 L 395,99.5 L 376,67.5 C 376,67.5 370,65.1 366,63.5 Z`,
        labelPos: { x: 460, y: 150 },
        anchorPos: { x: 428, y: 155 },
        textAnchor: "start",
        position: { x: 380, y: 220 },
        size: { width: 220, height: 200 },
        resources: (phaseMap.get(1) || [])
      },
      {
        id: 2,
        name: "Article Type\nAssignment",
        description: "Intelligent article type detection",
        executionMode: "sequential",
        color: "#40EDC3",
        fillPath: `M 131.5,21 C 121.3,24.4 105.5,30.5 105.5,30.5 H 102.5 C 102.5,30.5 108.9,47.8 112.5,59 C 114.8,66 117,69.7 118,77 C 120,90.9 112.5,112.5 112.5,112.5 V 139 C 112.5,139 114,153.1 123.5,155.5 C 132.7,157.8 135.5,153 144.5,148.5 C 152.3,144.6 166,137.4 174.5,135.5 C 184.4,133.3 189,142.8 196,135.5 C 199.5,131.8 195.6,132.6 196,127.5 C 196.8,119.5 189.4,116.4 188,108.5 C 186.4,98.8 191,83.5 191,83.5 L 203,59 C 203,59 220.9,44 223,30.5 C 223.8,25.7 223,18 223,18 L 235,5 H 223 L 191,8.5 C 191,8.5 183.1,12.7 177.5,14 C 168.6,16.2 163.1,12.6 154,14 C 144.9,15.4 140.2,18.1 131.5,21 Z`,
        labelPos: { x: 165, y: -70 },
        anchorPos: { x: 165, y: 20 },
        textAnchor: "middle",
        position: { x: 630, y: 280 },
        size: { width: 200, height: 180 },
        resources: (phaseMap.get(2) || [])
      },
      {
        id: 3,
        name: "AI Content\nGeneration",
        description: "Unified AI content generation engine",
        executionMode: "sequential",
        color: "#7FFBA9",
        fillPath: `M 298,18.5 C 278.1,11.3 245,6.5 245,6.5 H 242.5 C 242.5,242.5 233.1,10.3 230,15.5 C 227.3,20.1 227.5,29 227.5,29 L 223,42 L 210,57 C 210,57 202.1,69.8 198,78.5 C 195.2,84.6 191.5,94.5 191.5,94.5 L 194,109.5 L 200.5,117.5 C 200.5,120.7 198.5,130.4 200.5,140 C 202.5,149.6 198,146.5 198,151 L 204.5,155.5 C 204.5,155.5 206.4,154.6 213.5,155.5 C 222.4,156.6 236.6,158.7 245,161.5 C 254,164.5 258.6,167.5 267.5,170.5 C 279.2,174.5 298,178.5 298,178.5 C 298,178.5 301.5,186.6 309.5,188 C 317.3,189.4 326.6,182.5 334.5,182.5 C 339,182.5 341.8,179.8 344.5,175.5 C 353.9,160.8 348.5,131 348.5,131 L 350.5,80.5 C 350.5,80.5 366.5,58 362.5,55 C 358.5,52 336,36.5 336,36.5 C 336,36.5 313.5,24.1 298,18.5 Z`,
        labelPos: { x: 275, y: -25 },
        anchorPos: { x: 275, y: 15 },
        textAnchor: "middle",
        position: { x: 130, y: 530 },
        size: { width: 220, height: 140 },
        resources: (phaseMap.get(3) || [])
      },
      {
        id: 4,
        name: "Article\nEnhancement",
        description: "Post-processing workflow",
        executionMode: "sequential",
        color: "#EF4444",
        fillPath: `M 230.5,248 C 230.5,248 191.6,252.2 190.5,265.5 C 189.6,276.7 200.4,276.8 208,285 C 214.9,292.4 225.5,304 225.5,304 L 243,316.5 L 261.5,329.5 C 261.5,329.5 266.9,337 271.5,340.5 C 276.4,344.2 285.5,347.5 285.5,347.5 L 297.5,362 C 297.5,362 309.1,376.4 314,371 C 315.9,369 316.5,364.5 316.5,364.5 L 307.5,347.5 C 307.5,347.5 289.5,319 304,316.5 L 333.5,306.5 C 333.5,306.5 352.1,300.9 360.5,292.5 C 367.2,285.9 373,272 373,272 C 373,272 375.7,258.4 370.5,253 C 367.5,249.8 364.4,250.1 360.5,248 C 352.7,243.7 350.4,236.5 341.5,235.5 C 335.6,234.8 326.5,238.5 326.5,238.5 C 326.5,238.5 304.1,245 289.5,248 C 277.5,250.4 270.8,252.3 258.5,253 C 243.5,253.9 230.5,248 230.5,248 Z`,
        labelPos: { x: 400, y: 300 },
        anchorPos: { x: 375, y: 295 },
        textAnchor: "start",
        position: { x: 580, y: 510 },
        size: { width: 180, height: 120 },
        resources: (phaseMap.get(4) || [])
      },
      {
        id: 5,
        name: "WordPress\nDeployment",
        description: "Automated content deployment",
        executionMode: "sequential",
        color: "#F59E0B",
        fillPath: `M 337.5,213.5 C 337.5,213.5 349,208 342,192.5 C 336.6,180.6 320.5,196.4 308,192.5 C 296.4,188.9 293.9,177.9 282,175.5 C 275.9,174.3 272.2,176.5 266,175.5 C 258.2,174.2 254.5,170.9 247,168 C 240.4,165.4 237,162.8 230,161.5 C 222.7,160.1 218.3,163.2 211,161.5 C 204.1,159.9 198.3,159.6 194.5,153.5 C 192.4,150.1 200,147 192,143.5 C 184,140 161,143.5 161,143.5 C 154.7,146.1 146.5,153.5 146.5,153.5 L 133,161.5 L 121,168 L 108,181 L 96,198.5 C 96,198.5 87.8,212.5 89,222 C 90.2,231.2 95.1,235.4 101,242.5 C 110.8,254.3 133,265 133,265 C 133,265 146,272.2 155,272 C 163.5,271.8 175.5,265 175.5,265 L 198,253.5 C 198,253.5 211,247.2 220,245.5 C 230.4,243.5 247,245.5 247,245.5 C 247,245.5 256.7,247.9 263,248 C 273.4,248.2 289,242.5 289,242.5 L 318,234.5 L 337.5,231 V 213.5 Z`,
        labelPos: { x: -60, y: 235 },
        anchorPos: { x: 88, y: 222 },
        textAnchor: "end",
        position: { x: 370, y: 650 },
        size: { width: 120, height: 90 },
        resources: (phaseMap.get(5) || [])
      }
    ];

    const connections = [
      { from: 0, to: 1, label: "Validated Request", type: "always-seq" },
      { from: 1, to: 2, label: "Approved Cluster", type: "seq" },
      { from: 2, to: 3, label: "Job Created", type: "seq" },
      { from: 3, to: 4, label: "Raw Article", type: "seq" },
      { from: 4, to: 5, label: "Enhanced Article", type: "seq" },
      { from: 5, to: 0, label: "Completion Status", type: "feedback", dashed: true }
    ];

    return {
      version: processData.version,
      phases: phases,
      allResources: allResources.sort((a, b) => a.processOrder - b.processOrder),
      connections: connections,
      totalResources: Object.keys(architectureData.services || {}).length
    };
  };

  // Render brain structure
  const renderBrainStructure = (data) => {
    const svg = d3.select(svgRef.current);
    const phaseNodesGroup = svg.select('#phase-nodes');
    const flowConnectionsGroup = svg.select('#flow-connections');

    // Clear previous content
    phaseNodesGroup.selectAll('*').remove();
    flowConnectionsGroup.selectAll('*').remove();

    // Add brain outline path (inside zoom wrapper)
    const zoomWrapper = svg.select('#zoom-wrapper');
    let brainOutline = zoomWrapper.select('#brain-outline');

    if (brainOutline.empty()) {
      brainOutline = zoomWrapper.insert('g', ':first-child')
        .attr('id', 'brain-outline');
    } else {
      brainOutline.selectAll('*').remove();
    }

    // Draw brain outline using exact path from original HTML
    brainOutline.append('path')
      .attr('class', 'brain-structure')
      .attr('d', 'M 81,224 L 98,245.5 L 114,258 L 131.5,270 L 159,276.5 L 182,266 L 195,279.5 L 206.5,290 L 215.5,303 L 238.5,319 L 255,329 L 266,343.5 L 282,351 L 306.5,375 H 317.5 L 320.5,365.5 L 302.5,322.5 L 314.5,319 C 314.5,319 317.6,317.7 320.5,316.5 C 323.9,315.1 326.4,314.2 330,313.5 C 340.2,311.7 343.5,304.4 350.5,304 C 357.5,303.6 371.6,291.1 375,276.5 C 377.4,266.6 375,250.5 375,250.5 H 385.5 L 410.5,239 L 428,221 L 433,196 L 428,181.5 V 157.5 L 421.5,138.5 L 410.5,119 L 395.5,92.5 L 381.5,71 L 364,51.5 L 341.5,36.5 L 315.5,22.5 L 292.5,14.5 L 263,5 L 240.5,1.5 H 215 L 191,5 L 167.5,10 H 152.5 L 135,14.5 L 117.5,22.5 L 98,30.5 L 78,36.5 L 70,42.5 L 56.5,51.5 L 41.5,64.5 L 27.5,76 L 20.5,88.5 L 10.5,103 L 5,119 L 1.5,152 L 8,172 L 20.5,190.5 L 38,201.5 L 56.5,224 H 81 Z')
      .attr('fill', 'none')
      .attr('stroke', '#40EDC3')
      .attr('stroke-width', '2')
      .attr('opacity', '0.4')
      .attr('filter', 'url(#glow)');

    // Render flow connections - COMMENTED OUT: Lines distort the UI
    // data.connections.forEach(conn => {
    //   const fromPhase = data.phases.find(p => p.id === conn.from);
    //   const toPhase = data.phases.find(p => p.id === conn.to);

    //   if (fromPhase && toPhase) {
    //     const fromX = fromPhase.position.x + fromPhase.size.width / 2;
    //     const fromY = fromPhase.position.y + fromPhase.size.height / 2;
    //     const toX = toPhase.position.x + toPhase.size.width / 2;
    //     const toY = toPhase.position.y + toPhase.size.height / 2;

    //     flowConnectionsGroup.append('path')
    //       .attr('class', 'flow-path')
    //       .attr('d', `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${(fromY + toY) / 2 - 50} ${toX} ${toY}`)
    //       .attr('stroke', '#40EDC3')
    //       .attr('stroke-dasharray', conn.dashed ? '5,5' : null)
    //       .attr('marker-end', 'url(#arrowhead-seq)');
    //   }
    // });

    // Render phase nodes (brain regions)
    data.phases.forEach((phase, i) => {
      // Calculate dynamic metrics based on current state
      const coverage = calculateCoverage(phase, currentBrainState);
      const grade = getGradeFromCoverage(coverage);
      const status = getStatusFromGrade(grade);
      const statusClass = status ? `status-${status.toLowerCase()}` : '';

      // Build full name dynamically
      const fullName = `Phase ${phase.id}: ${phase.name.replace(/\n/g, ' ')} - ${coverage}% Coverage (${grade})`;

      const phaseGroup = phaseNodesGroup.append('g')
        .attr('class', 'phase-node')
        .attr('data-phase-id', phase.id);

      // Draw brain region shape using actual brain lobe path
      const brainRegion = phaseGroup.append('path')
        .attr('class', `brain-region ${statusClass}`)
        .attr('d', phase.fillPath)
        .attr('fill', phase.color)
        .attr('fill-opacity', 0.3)
        .attr('stroke', phase.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8)
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .on('mousedown', function(event) {
          // Stop mousedown from reaching zoom handler
          event.stopPropagation();
        })
        .on('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          console.log('=== BRAIN REGION CLICK EVENT ===');
          console.log('Phase ID:', phase.id);
          console.log('Phase Name:', phase.name);
          console.log('Event:', event);
          handlePhaseClick({...phase, coverage, grade, status, fullName});
        })
        .on('mouseenter', (event) => {
          // Dim all other regions
          svg.selectAll('.brain-region').classed('dimmed', function() {
            return this.parentNode.getAttribute('data-phase-id') != phase.id;
          });

          // Dim resource nodes from other phases
          svg.selectAll('.resource-node').style('opacity', function() {
            return this.getAttribute('data-phase-id') == phase.id ? '1' : '0.2';
          });

          // Highlight current region
          d3.select(event.currentTarget).classed('highlighted', true);

          showTooltip(event, fullName);
        })
        .on('mouseleave', () => {
          // Remove dimmed class from all regions
          svg.selectAll('.brain-region').classed('dimmed', false).classed('highlighted', false);

          // Restore opacity for all resource nodes
          svg.selectAll('.resource-node').style('opacity', '1');

          hideTooltip();
        });

      // Draw anchor line connecting label to region
      phaseGroup.append('line')
        .attr('class', 'label-anchor-line')
        .attr('x1', phase.labelPos.x)
        .attr('y1', phase.labelPos.y)
        .attr('x2', phase.anchorPos.x)
        .attr('y2', phase.anchorPos.y)
        .attr('stroke', '#40EDC3')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-dasharray', '2,2');

      // Phase label positioned using labelPos
      const labelGroup = phaseGroup.append('text')
        .attr('class', 'phase-label')
        .attr('x', phase.labelPos.x)
        .attr('y', phase.labelPos.y)
        .attr('text-anchor', phase.textAnchor);

      phase.name.split('\n').forEach((line, i) => {
        labelGroup.append('tspan')
          .attr('x', phase.labelPos.x)
          .attr('dy', i === 0 ? 0 : 20)
          .text(line);
      });

      // Resource count near label
      const visibleCount = getVisibleResourceCount(phase, currentBrainState);
      phaseGroup.append('text')
        .attr('class', 'phase-count')
        .attr('x', phase.labelPos.x)
        .attr('y', phase.labelPos.y + 50)
        .attr('text-anchor', phase.textAnchor)
        .text(`${visibleCount} resources`);
    });

    // Render resource nodes if enabled using golden angle spiral
    if (showResourceNodes && data.phases) {
      const resourceNodesGroup = svg.select('#resource-nodes');
      resourceNodesGroup.selectAll('*').remove();

      // Define center positions for each phase region (from original HTML)
      const regionCenters = [
        { x: 63, y: 140, radiusX: 35, radiusY: 50 },    // Phase 0: Frontal Lobe
        { x: 385, y: 165, radiusX: 28, radiusY: 50 },   // Phase 1: Parietal Lobe
        { x: 165, y: 80, radiusX: 25, radiusY: 30 },    // Phase 2: Occipital Lobe
        { x: 265, y: 105, radiusX: 40, radiusY: 45 },   // Phase 3: Temporal Lobe
        { x: 285, y: 295, radiusX: 40, radiusY: 45 },   // Phase 4: Cerebellum
        { x: 210, y: 210, radiusX: 50, radiusY: 40 }    // Phase 5: Brain Stem
      ];

      data.phases.forEach(phase => {
        if (!phase.resources || phase.resources.length === 0) return;

        const center = regionCenters[phase.id];
        if (!center) return;

        const lobeCenterX = center.x;
        const lobeCenterY = center.y;
        const lobeRadiusX = center.radiusX;
        const lobeRadiusY = center.radiusY;

        // Filter resources based on gap/fix state
        const visibleResources = currentBrainState === 'gap'
          ? phase.resources.filter(r => !isNewResource(r.processOrder))
          : phase.resources;

        visibleResources.forEach((resource, idx) => {
          // Use golden angle spiral for natural distribution
          const angle = idx * 137.5 * (Math.PI / 180); // Golden angle
          const radius = Math.sqrt(idx / visibleResources.length) * 0.75; // Radial distance

          const x = lobeCenterX + radius * lobeRadiusX * Math.cos(angle);
          const y = lobeCenterY + radius * lobeRadiusY * Math.sin(angle);

          // Resource color logic based on current brain state (from original HTML)
          let resourceColor;
          if (currentBrainState === 'gap') {
            // Gap mode: Show existing resources
            if (phase.id === 4 || phase.id === 5) {
              resourceColor = '#FFB347'; // Orange/yellow for critical phases
            } else {
              resourceColor = '#60D9F5'; // Cyan for existing resources
            }
          } else {
            // Fix mode: All resources complete
            resourceColor = '#40EDC3'; // Green for fixed state
          }

          // Create resource node group
          const nodeGroup = resourceNodesGroup.append('g')
            .attr('class', 'resource-node')
            .attr('data-resource-id', resource.id)
            .attr('data-phase-id', phase.id)
            .style('cursor', 'pointer');

          // Resource circle
          const circle = nodeGroup.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 3.5)
            .attr('fill', resourceColor)
            .attr('stroke', resourceColor)
            .attr('stroke-width', 1)
            .attr('opacity', 0.9)
            .style('filter', 'drop-shadow(0 0 2px currentColor)');

          // Hover and click handlers
          nodeGroup
            .on('mouseenter', (event) => {
              circle.attr('r', 6).attr('opacity', 1);
              const tooltipText = `${resource.name || resource.id}\nType: ${resource.type || 'N/A'}\nLayer: ${resource.layer}\nProcess Order: ${resource.processOrder}`;
              showTooltip(event, tooltipText);
            })
            .on('mouseleave', () => {
              circle.attr('r', 3.5).attr('opacity', 0.9);
              hideTooltip();
            })
            .on('mousedown', function(event) {
              // Stop mousedown from reaching zoom handler
              event.stopPropagation();
            })
            .on('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              console.log('=== RESOURCE NODE CLICK EVENT ===');
              console.log('Resource ID:', resource.id);
              console.log('Resource Name:', resource.name);
              console.log('Phase ID:', phase.id);
              handleResourceClick(resource, phase);
            });
        });
      });
    }
  };

  // Handle phase click
  const handlePhaseClick = useCallback((phase) => {
    console.log('=== HANDLE PHASE CLICK ===');
    console.log('Phase object:', phase);
    console.log('Setting selectedPhase state...');
    setSelectedPhase(phase);
    setSelectedResource(null); // Clear resource selection when phase is clicked
    setActiveTab('overview');
    console.log('State updated, detail panel should now show');

    // Update selected state in SVG
    d3.selectAll('.brain-region').classed('selected', false);
    d3.select(`[data-phase-id="${phase.id}"] .brain-region`).classed('selected', true);
    console.log('=== END HANDLE PHASE CLICK ===');
  }, []);

  // Handle resource click
  const handleResourceClick = useCallback((resource, phase) => {
    console.log('=== HANDLE RESOURCE CLICK ===');
    console.log('Resource object:', resource);
    console.log('Phase object:', phase);
    console.log('Setting selectedResource state...');
    setSelectedResource(resource);
    setSelectedPhase(phase);
    setActiveTab('overview'); // Show resource details in overview tab
    console.log('State updated, detail panel should now show resource details');
    console.log('=== END HANDLE RESOURCE CLICK ===');
  }, []);

  // Tooltip functions
  const showTooltip = useCallback((event, text) => {
    const tooltip = tooltipRef.current;
    if (tooltip) {
      tooltip.textContent = text;
      tooltip.style.left = (event.pageX + 15) + 'px';
      tooltip.style.top = (event.pageY + 15) + 'px';
      tooltip.classList.add('visible');
    }
  }, []);

  const hideTooltip = useCallback(() => {
    const tooltip = tooltipRef.current;
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }, []);

  // Toggle brain state
  const toggleBrainState = () => {
    const newState = currentBrainState === 'gap' ? 'fixed' : 'gap';
    setCurrentBrainState(newState);
    if (visualizationDataRef.current) {
      renderBrainStructure(visualizationDataRef.current);
    }
  };

  // Zoom functions
  const zoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.25, 2.5);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
    applyZoom(1.0);
  };

  const applyZoom = (scale) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node());

    // Create new transform with same translation but new scale
    const newTransform = d3.zoomIdentity
      .translate(currentTransform.x, currentTransform.y)
      .scale(scale);

    // Apply zoom transform programmatically using stored zoom behavior
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.transform,
      newTransform
    );
  };

  // Switch tab
  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  // Get CloudFormation template for resource
  const getCloudFormationTemplate = (resourceId) => {
    if (!cloudformationData || !cloudformationData.Resources) {
      return null;
    }
    // CloudFormation resource keys don't have dashes, but our resource IDs do
    // Convert "SCAI-Prod-Core-ExecutionRole" to "SCAIProdCoreExecutionRole"
    const cfResourceKey = resourceId.replace(/-/g, '');
    return cloudformationData.Resources[cfResourceKey];
  };

  // Initialize visualization when data is loaded
  useEffect(() => {
    if (isDataLoaded && architectureData && processData) {
      const data = transformDataToNeuralFlow(architectureData, processData);
      visualizationDataRef.current = data;
      renderBrainStructure(data);
    }
  }, [isDataLoaded, architectureData, processData, currentBrainState, handlePhaseClick, handleResourceClick, showTooltip, hideTooltip]);

  // Setup zoom and pan behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoomWrapper = svg.select('#zoom-wrapper');

    // Create zoom behavior with filter to allow clicks on phase nodes
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2.5])
      .filter((event) => {
        // Block all zoom interactions on brain elements except wheel
        const target = event.target;
        const isBrainElement = target.classList.contains('brain-region') ||
                               target.classList.contains('resource-node') ||
                               target.closest('.phase-node');

        // For brain elements, only allow wheel zoom
        if (isBrainElement) {
          return event.type === 'wheel';
        }

        // For other areas, allow zoom but block if it's a click or dblclick
        if (event.type === 'click' || event.type === 'dblclick') {
          return false;
        }

        // Allow other zoom events (drag, wheel, etc) on background
        return true;
      })
      .on('zoom', (event) => {
        zoomWrapper.attr('transform', event.transform);
        // Update zoom level state for button controls
        setZoomLevel(event.transform.k);
      });

    // Store zoom behavior in ref for button controls
    zoomBehaviorRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Set initial transform
    svg.call(zoom.transform, d3.zoomIdentity.scale(zoomLevel));

    // Cleanup
    return () => {
      svg.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, [isDataLoaded]);

  if (!isDataLoaded) {
    return (
      <div className="page-container">
        <div className="welcome-message">
          <h2>Welcome to Flow Brain</h2>
          <p>Please import the architecture files to visualize the process flow and phase relationships.</p>
          <div className="import-hint">
            Click the "Import Files" button in the header to get started.
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall coverage dynamically
  const overallCoverage = visualizationDataRef.current?.phases
    ? Math.round(
        visualizationDataRef.current.phases.reduce((sum, phase) =>
          sum + calculateCoverage(phase, currentBrainState), 0
        ) / visualizationDataRef.current.phases.length
      )
    : 0;

  return (
    <>
      {/* Custom Tooltip */}
      <div ref={tooltipRef} id="custom-tooltip" className="custom-tooltip"></div>

      <div className="flowbrain-content">
        <div className="brain-canvas">
          <div className="canvas-wrapper" id="canvas-wrapper">
            {/* State Toggle Switch */}
            <div className="state-toggle-container">
              <div className="toggle-switch" onClick={toggleBrainState}>
                <div className="toggle-labels">
                  <span className={`toggle-label gap ${currentBrainState === 'gap' ? 'active' : ''}`}>GAP</span>
                  <span className={`toggle-label fix ${currentBrainState === 'fixed' ? 'active' : ''}`}>FIX</span>
                </div>
                <div className={`toggle-slider ${currentBrainState === 'gap' ? 'gap-active' : 'fix-active'}`}>
                  <span>{currentBrainState === 'gap' ? 'GAP' : 'FIX'}</span>
                  <span className="toggle-percentage">{overallCoverage}%</span>
                </div>
              </div>
            </div>

            {/* Resource Legend */}
            <div className="canvas-legend canvas-legend-left">
              <div className="legend-card-compact">
                <div className="legend-compact-title">RESOURCE NODES</div>
                <div id="legend-gap-view" style={{ display: currentBrainState === 'gap' ? 'block' : 'none' }}>
                  <div className="legend-compact-item">
                    <div className="gap-dot" style={{ background: '#FFB347', boxShadow: '0 0 6px rgba(255, 179, 71, 0.4)' }}></div>
                    <span className="legend-compact-text">Critical Phase</span>
                  </div>
                  <div className="legend-compact-item">
                    <div className="gap-dot" style={{ background: '#60D9F5', boxShadow: '0 0 6px rgba(96, 217, 245, 0.4)' }}></div>
                    <span className="legend-compact-text">Existing</span>
                  </div>
                </div>
                <div id="legend-fix-view" style={{ display: currentBrainState === 'fixed' ? 'block' : 'none' }}>
                  <div className="legend-compact-item">
                    <div className="gap-dot" style={{ background: '#40EDC3', boxShadow: '0 0 6px rgba(64, 237, 195, 0.4)' }}></div>
                    <span className="legend-compact-text">All Resources</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={zoomIn} title="Zoom In" disabled={zoomLevel >= 2.5}>+</button>
              <button className="zoom-btn" onClick={zoomOut} title="Zoom Out" disabled={zoomLevel <= 0.5}>−</button>
              <button className="zoom-btn" onClick={resetZoom} title="Reset Zoom">⟲</button>
            </div>

            {/* Phase Coverage Legend */}
            <div className="canvas-legend canvas-legend-right">
              <div className="legend-card-compact">
                <div className="legend-compact-title">PHASE COVERAGE</div>
                <div className="legend-compact-item">
                  <svg width="18" height="12">
                    <rect width="18" height="12" rx="2" fill="#2A9D8F" fillOpacity="0.25" stroke="#2A9D8F" strokeWidth="1.5" strokeOpacity="0.9"/>
                  </svg>
                  <span className="legend-compact-text">Complete</span>
                </div>
                <div className="legend-compact-item">
                  <svg width="18" height="12">
                    <rect width="18" height="12" rx="2" fill="#6B7F54" fillOpacity="0.18" stroke="#6B7F54" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="6,3"/>
                  </svg>
                  <span className="legend-compact-text">Partial</span>
                </div>
                <div className="legend-compact-item">
                  <svg width="18" height="12">
                    <rect width="18" height="12" rx="2" fill="#4A5568" fillOpacity="0.12" stroke="#4A5568" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="3,3"/>
                  </svg>
                  <span className="legend-compact-text">Low</span>
                </div>
                <div className="legend-compact-item">
                  <svg width="18" height="12">
                    <rect width="18" height="12" rx="2" fill="transparent" stroke="#C53030" strokeWidth="1.5" strokeOpacity="0.9"/>
                  </svg>
                  <span className="legend-compact-text">Missing</span>
                </div>
              </div>
            </div>

            {/* SVG Canvas */}
            <svg ref={svgRef} id="flow-svg" viewBox="-350 -100 1250 550" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="gradient-sequential" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: 'rgba(64, 237, 195, 0.8)', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: 'rgba(127, 251, 169, 0.6)', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: 'rgba(211, 248, 154, 0.4)', stopOpacity: 1}} />
                </linearGradient>
                <marker id="arrowhead-seq" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#40EDC3" />
                </marker>
                <filter id="glow-seq">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <g id="zoom-wrapper" transform="scale(1)">
                <g id="flow-connections"></g>
                <g id="resource-connections"></g>
                <g id="phase-nodes"></g>
                <g id="resource-nodes"></g>
              </g>
            </svg>
          </div>
        </div>

        {/* Details Panel */}
        <aside className="detail-panel" id="details-panel">
          <div className="detail-panel-header">
            <div className="detail-panel-title" id="details-title">
              {selectedResource ? (selectedResource.name || selectedResource.id) : (selectedPhase ? selectedPhase.name.replace('\n', ' ') : 'Select a phase')}
            </div>
            <div className="detail-panel-subtitle" id="details-subtitle">
              {selectedResource ? `Resource in Phase ${selectedPhase?.id}` : (selectedPhase ? `Phase ${selectedPhase.id}` : 'Click on any phase or resource to view details')}
            </div>
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => switchTab('overview')}>Overview</button>
            <button className={`tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => switchTab('resources')}>Resources</button>
            <button className={`tab ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => switchTab('connections')}>Connections</button>
            <button className={`tab ${activeTab === 'cloudformation' ? 'active' : ''}`} onClick={() => switchTab('cloudformation')}>CloudFormation</button>
          </div>

          <div className="tab-content-wrapper">
            {/* Overview Tab */}
            <div className={`tab-pane ${activeTab === 'overview' ? 'active' : ''}`}>
              {selectedResource ? (
                <>
                  <div className="details-section">
                    <h3>Resource ID</h3>
                    <p className="resource-id">{selectedResource.id}</p>
                  </div>
                  <div className="details-section">
                    <h3>Description</h3>
                    <p>{selectedResource.description || 'No description available'}</p>
                  </div>
                  <div className="metric-grid">
                    <div className="metric-card">
                      <div className="metric-value">
                        {selectedResource.type || 'N/A'}
                      </div>
                      <div className="metric-label">Resource Type</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">
                        {selectedResource.layer || 'N/A'}
                      </div>
                      <div className="metric-label">Layer</div>
                    </div>
                  </div>
                  <div className="metric-grid">
                    <div className="metric-card">
                      <div className="metric-value">
                        {selectedResource.processOrder}
                      </div>
                      <div className="metric-label">Process Order</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-value">
                        {selectedResource.phaseNum}
                      </div>
                      <div className="metric-label">Phase Number</div>
                    </div>
                  </div>
                  <div className="details-section">
                    <h3>Parent Phase</h3>
                    <p>{selectedPhase ? selectedPhase.name.replace('\n', ' ') : 'N/A'}</p>
                  </div>
                </>
              ) : selectedPhase ? (
                <>
                  <div className="details-section">
                    <h3>Description</h3>
                    <p>{selectedPhase.description}</p>
                  </div>
                  <div className="details-section">
                    <h3>Execution Mode</h3>
                    <span className={`detail-badge ${selectedPhase.executionMode}`}>
                      {selectedPhase.executionMode}
                    </span>
                  </div>
                  <div className="metric-grid">
                    <div className="metric-card">
                      <div className={`metric-value ${selectedPhase.status?.toLowerCase()}`}>
                        {selectedPhase.coverage}%
                      </div>
                      <div className="metric-label">Coverage</div>
                    </div>
                    <div className="metric-card">
                      <div className={`metric-value ${selectedPhase.status?.toLowerCase()}`}>
                        {selectedPhase.grade}
                      </div>
                      <div className="metric-label">Grade</div>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 20px' }}>
                  Select a phase or resource to view comprehensive details about its properties, execution mode, and connections.
                </p>
              )}
            </div>

            {/* Resources Tab */}
            <div className={`tab-pane ${activeTab === 'resources' ? 'active' : ''}`}>
              <div className="item-list">
                {selectedPhase?.resources?.map((resource, idx) => (
                  <div key={idx} className="list-item">
                    <div className="item-header">
                      <div className="item-title">{resource.name || resource.id}</div>
                    </div>
                    <div className="item-description">{resource.description || 'No description available'}</div>
                    <div className="resource-id">{resource.id}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connections Tab */}
            <div className={`tab-pane ${activeTab === 'connections' ? 'active' : ''}`}>
              {selectedPhase && visualizationDataRef.current && (
                <div className="item-list">
                  {visualizationDataRef.current.connections
                    .filter(conn => conn.from === selectedPhase.id || conn.to === selectedPhase.id)
                    .map((conn, idx) => (
                      <div key={idx} className="list-item">
                        <div className="item-header">
                          <div className="item-title">{conn.label}</div>
                        </div>
                        <div className="item-description">
                          Phase {conn.from} → Phase {conn.to}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* CloudFormation Tab */}
            <div className={`tab-pane ${activeTab === 'cloudformation' ? 'active' : ''}`}>
              {selectedResource ? (
                // Show CloudFormation for selected resource only
                <div style={{ marginBottom: '20px' }}>
                  <div className="cf-resource-info">
                    <div className="label">Resource</div>
                    <div className="value">{selectedResource.id}</div>
                  </div>
                  {(() => {
                    const cfTemplate = getCloudFormationTemplate(selectedResource.id);
                    return cfTemplate ? (
                      <div className="cf-code-block">
                        <pre>{JSON.stringify(cfTemplate, null, 2)}</pre>
                      </div>
                    ) : (
                      <div className="cf-not-available">
                        CloudFormation template not available for this resource
                      </div>
                    );
                  })()}
                </div>
              ) : selectedPhase?.resources?.length > 0 ? (
                // Show CloudFormation for all resources in phase
                selectedPhase.resources.map((resource, idx) => {
                  const cfTemplate = getCloudFormationTemplate(resource.id);
                  return (
                    <div key={idx} style={{ marginBottom: '20px' }}>
                      <div className="cf-resource-info">
                        <div className="label">Resource</div>
                        <div className="value">{resource.id}</div>
                      </div>
                      {cfTemplate ? (
                        <div className="cf-code-block">
                          <pre>{JSON.stringify(cfTemplate, null, 2)}</pre>
                        </div>
                      ) : (
                        <div className="cf-not-available">
                          CloudFormation template not available for this resource
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="cf-not-available">
                  No resources selected
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default FlowBrain;
