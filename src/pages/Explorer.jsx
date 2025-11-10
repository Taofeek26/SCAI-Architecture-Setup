import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useData } from '../contexts/DataContext';
import './Explorer.css';

const Explorer = () => {
  const { isDataLoaded, architectureData, processData, cloudformationData } = useData();
  const explorerInstanceRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isDataLoaded && !initializedRef.current) {
      console.log('Explorer: Initializing visualization...');
      console.log('Architecture data:', architectureData);
      console.log('Process data:', processData);

      try {
        // Transform data to ContentGen format
        const contentGenData = transformDataToContentGenFormat(architectureData, processData);
        console.log('ContentGen data transformed:', contentGenData);
        console.log('Total phases:', contentGenData?.processFlow?.phases?.length);
        console.log('Total resources:', Object.keys(contentGenData?.resources || {}).length);

        // Store CloudFormation data globally for the explorer
        window.cloudformationTemplate = cloudformationData;

        // Initialize explorer
        if (!explorerInstanceRef.current) {
          explorerInstanceRef.current = new ContentGenExplorer(contentGenData);
          window.explorer = explorerInstanceRef.current; // Store globally for helper functions

          // Make helper functions globally accessible for onclick handlers
          window.toggleSidebar = toggleSidebar;
          window.fitToView = fitToView;
          window.resetZoom = resetZoom;
          window.toggleConnections = toggleConnections;
          window.closeDetailsPanel = closeDetailsPanel;
          window.switchTab = switchTab;

          initializedRef.current = true;
          console.log('✅ Explorer initialized successfully');
        }
      } catch (error) {
        console.error('❌ Error initializing explorer:', error);
        console.error('Error stack:', error.stack);
      }
    }
  }, [isDataLoaded, architectureData, processData, cloudformationData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (explorerInstanceRef.current) {
        // Cleanup
        explorerInstanceRef.current = null;
        window.explorer = null;
        window.toggleSidebar = null;
        window.fitToView = null;
        window.resetZoom = null;
        window.toggleConnections = null;
        window.closeDetailsPanel = null;
        window.switchTab = null;
        window.cloudformationTemplate = null;
        initializedRef.current = false;
      }
    };
  }, []);

  if (!isDataLoaded) {
    return (
      <div className="page-container">
        <div className="welcome-message">
          <h2>Welcome to 7-Phase Explorer</h2>
          <p>Please import the architecture files to visualize the 7-phase content generation system.</p>
          <div className="import-hint">
            Click the "Import Files" button in the header to get started.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="main-container">
      {/* Sidebar */}
      <div id="sidebar">
        <div id="sidebar-header">
          <div id="sidebar-title">Architecture Navigator</div>
          <button id="sidebar-minimize" onClick={toggleSidebar} title="Minimize sidebar">☰</button>
        </div>
        <div id="sidebar-content">
          <div id="layer-nav"></div>
        </div>
      </div>

      {/* Toggle button (shown when sidebar is collapsed) */}
      <button id="sidebar-toggle-btn" onClick={toggleSidebar} title="Show sidebar">☰</button>

      {/* Canvas */}
      <div id="canvas-container">
        <svg id="svg-canvas"></svg>

        {/* Controls */}
        <div id="controls">
          <button className="control-btn" onClick={fitToView}>Fit to View</button>
          <button className="control-btn" onClick={resetZoom}>Reset Zoom</button>
          <button className="control-btn" id="toggle-connections-btn" onClick={toggleConnections} title="Toggle connection lines">
            <span id="connections-status">Connections: ON</span>
          </button>
        </div>

        {/* Details Panel */}
        <div id="details-panel">
          <div className="details-header">
            <div className="details-title" id="details-resource-name"></div>
            <div className="details-controls">
              <button className="details-control-btn" onClick={closeDetailsPanel} title="Close">×</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="details-tabs">
            <button className="details-tab active" onClick={() => switchTab('overview')}>Overview</button>
            <button className="details-tab" onClick={() => switchTab('cloudformation')}>CloudFormation</button>
          </div>

          {/* Tab Contents */}
          <div id="tab-overview" className="tab-content active"></div>
          <div id="tab-cloudformation" className="tab-content"></div>
        </div>

        {/* Resource Type Summary Panel */}
        <div id="resource-type-summary">
          <h3>Resource Types</h3>
          <table className="type-summary-table" id="type-summary-table">
            {/* Populated by JavaScript */}
          </table>
          <div className="type-summary-total">
            <span className="type-summary-total-label">Total Resources</span>
            <span className="type-summary-total-count" id="total-resource-count">0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DATA TRANSFORMATION FUNCTION
// ============================================================================
function transformDataToContentGenFormat(architectureData, processData) {
  // Extract process map (first one in the array)
  const processMap = processData.processMaps[0];

  // Build phase structure from process-oriented data
  const phaseMap = new Map();

  processMap.resources.forEach(resource => {
    const processOrder = parseFloat(resource.processOrder);
    const phaseNum = Math.floor(processOrder); // 0.1 -> 0, 1.2 -> 1, etc.

    if (!phaseMap.has(phaseNum)) {
      phaseMap.set(phaseNum, []);
    }
    phaseMap.get(phaseNum).push(resource.id);
  });

  // Define phase metadata (matching original structure)
  const phases = [
    {
      id: 0,
      phase: 0,
      name: "User Input & Routing",
      description: "Entry point for all content generation requests with intelligent routing",
      executionMode: "always-active",
      hasSubPhases: true,
      isBranching: true,
      subPhases: [
        {
          name: "Entry Point",
          services: phaseMap.get(0)?.filter(id => id.includes('ContentEntryAPI')) || []
        },
        {
          name: "Router",
          services: phaseMap.get(0)?.filter(id => id.includes('RequestRouter')) || [],
          branchesTo: ["Manual Path", "Auto Path"]
        },
        {
          name: "Manual Path",
          services: phaseMap.get(0)?.filter(id => id.includes('ManualEntryHandler')) || [],
          branchPosition: "top"
        },
        {
          name: "Auto Path",
          services: phaseMap.get(0)?.filter(id => id.includes('AutoPopulationHandler')) || [],
          branchPosition: "bottom"
        }
      ],
      services: phaseMap.get(0) || []
    },
    {
      id: 1,
      phase: 1,
      name: "Cluster Formation & Review",
      description: "AI-powered keyword expansion, cluster scoring, cost estimation, and user review",
      executionMode: "sequential",
      hasSubPhases: false,
      services: phaseMap.get(1) || []
    },
    {
      id: 2,
      phase: 2,
      name: "Article Type Assignment",
      description: "Intelligent article type detection based on keyword intent",
      executionMode: "sequential",
      hasSubPhases: false,
      services: phaseMap.get(2) || []
    },
    {
      id: 3,
      phase: 3,
      name: "AI Content Generation",
      description: "Unified AI content generation engine using GPT-4-turbo with real-time progress updates",
      executionMode: "sequential",
      hasSubPhases: false,
      services: phaseMap.get(3) || []
    },
    {
      id: 4,
      phase: 4,
      name: "Article Enhancement",
      description: "Post-processing: keyword optimization, heading generation, paragraph expansion, product insertion, image generation, and internal linking",
      executionMode: "sequential",
      hasSubPhases: false,
      services: phaseMap.get(4) || []
    },
    {
      id: 5,
      phase: 5,
      name: "WordPress Deployment",
      description: "Automated plugin installation and content deployment to WordPress sites",
      executionMode: "sequential",
      hasSubPhases: false,
      services: phaseMap.get(5) || []
    }
  ];

  // Build resources object from architecture data, enriched with process data
  const resources = {};

  // Convert services object to array for iteration
  Object.entries(architectureData.services).forEach(([serviceId, archResource]) => {
    // Find matching resource in process data
    const processResource = processMap.resources.find(pr => pr.id === archResource.id);

    let assignedPhase = 'infrastructure'; // Default for resources not in process flow

    if (processResource) {
      const processOrder = parseFloat(processResource.processOrder);
      const phaseNum = Math.floor(processOrder);
      assignedPhase = phaseNum;

      // Handle special cases: Security, Data, Comm layers are cross-cutting
      if (archResource.id.includes('-Security-')) {
        assignedPhase = 'infrastructure'; // Security resources are cross-cutting
      } else if (archResource.id.includes('-Data-')) {
        assignedPhase = 'infrastructure'; // Data resources are cross-cutting
      } else if (archResource.id.includes('-Comm-')) {
        assignedPhase = 'infrastructure'; // Comm resources are cross-cutting
      } else if (archResource.id.includes('-Monitor-')) {
        assignedPhase = 'infrastructure'; // Monitor resources are cross-cutting
      }
    }

    // Include ALL resources from architecture, whether in process flow or not
    resources[archResource.id] = {
      id: archResource.id,
      name: archResource.name,
      type: archResource.type,
      category: archResource.category,
      layer: archResource.layer,
      phase: assignedPhase,
      description: processResource?.metadata?.description || archResource.metadata?.description || '',
      purpose: processResource?.metadata?.purpose || archResource.metadata?.purpose || '',
      capabilities: processResource?.metadata?.capabilities || archResource.metadata?.capabilities || [],
      integrations: processResource?.metadata?.integrations || archResource.metadata?.integrations || [],
      connections: {
        inbound: processResource?.connections?.inbound || archResource.connections?.inbound || [],
        outbound: processResource?.connections?.outbound || archResource.connections?.outbound || []
      },
      requirements: processResource?.requirements || archResource.requirements || []
    };
  });

  // Also add any process resources not in architecture
  processMap.resources.forEach(processResource => {
    if (!resources[processResource.id]) {
      const processOrder = parseFloat(processResource.processOrder);
      const phaseNum = Math.floor(processOrder);

      let assignedPhase = phaseNum;

      // Handle special cases
      if (processResource.id.includes('-Security-')) {
        assignedPhase = 'infrastructure';
      } else if (processResource.id.includes('-Data-')) {
        assignedPhase = 'infrastructure';
      } else if (processResource.id.includes('-Comm-')) {
        assignedPhase = 'infrastructure';
      } else if (processResource.id.includes('-Monitor-')) {
        assignedPhase = 'infrastructure';
      }

      resources[processResource.id] = {
        id: processResource.id,
        name: processResource.name,
        type: processResource.type,
        category: processResource.category,
        layer: processResource.layer,
        phase: assignedPhase,
        description: processResource.metadata?.description || '',
        purpose: processResource.metadata?.purpose || '',
        capabilities: processResource.metadata?.capabilities || [],
        integrations: processResource.metadata?.integrations || [],
        connections: {
          inbound: processResource.connections?.inbound || [],
          outbound: processResource.connections?.outbound || []
        },
        requirements: processResource.requirements || []
      };
    }
  });

  // Define entry points
  const entryPoints = [
    {
      name: "Content Entry API",
      symbol: "🚪",
      description: "Single entry point for all content generation requests",
      targetPhase: 0,
      targetResource: "SCAI-Prod-Core-ContentEntryAPI"
    },
    {
      name: "Manual Entry",
      symbol: "✍️",
      description: "Manual keyword entry path",
      targetPhase: 0,
      targetResource: "SCAI-Prod-Core-ManualEntryHandler"
    },
    {
      name: "Auto Population",
      symbol: "🤖",
      description: "Automated content population path",
      targetPhase: 0,
      targetResource: "SCAI-Prod-Core-AutoPopulationHandler"
    }
  ];

  // Calculate total resources
  const totalResources = Object.keys(resources).length;

  // Return transformed data
  return {
    version: architectureData.metadata?.version || "1.0.0",
    totalResources: totalResources,
    processFlow: {
      phases: phases
    },
    resources: resources,
    entryPoints: entryPoints
  };
}

class ContentGenExplorer {
    constructor(data) {
        this.data = data;
        this.phases = [];
        this.selectedResource = null;

        // Configuration
        this.config = {
            phaseWidth: 420,  // Width for sequential/always-active phases
            phaseWidthParallel: 680, // Wider phase box for parallel execution (2 sub-phases + gap)
            phaseSpacing: 120,  // Space between phases
            resourceWidth: 300,  // Width of each resource card
            resourceHeight: 75,  // Height of each resource card
            resourceSpacing: 25,  // Vertical space between resource cards
            phasePadding: 40, // Internal padding within phase box
            marginTop: 80,
            marginLeft: 50,
            marginRight: 50,
            marginBottom: 80
        };

        this.init();
    }

    init() {
        console.log('Total resources in data:', Object.keys(this.data.resources).length);

        // Group resources by phase
        this.groupResourcesByPhase();

        // Render entry points
        this.renderEntryPoints();

        // Render sidebar
        this.renderSidebar();

        // Render canvas
        this.renderCanvas();

        console.log('Initialization complete. Total resources rendered:', Object.keys(this.data.resources).length);
    }

    renderEntryPoints() {
        const container = document.getElementById('entry-points-list');
        if (!container || !this.data.entryPoints) return;

        container.innerHTML = '';

        this.data.entryPoints.forEach(entry => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 8px; background: #121212; border: 1px solid #2E2E2E; border-radius: 4px; cursor: pointer; transition: all 0.2s;';
            item.title = `${entry.description} → Phase ${entry.targetPhase}`;

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 16px;">${entry.symbol}</span>
                    <span style="font-size: 11px; font-weight: 600; color: #FFFFFF; line-height: 1.2;">${entry.name}</span>
                </div>
                <div style="font-size: 9px; color: #40EDC3; font-weight: 600;">Phase ${entry.targetPhase}</div>
            `;

            item.onmouseenter = () => {
                item.style.background = '#2E2E2E';
                item.style.borderColor = '#40EDC3';
                item.style.transform = 'translateY(-1px)';
            };

            item.onmouseleave = () => {
                item.style.background = '#121212';
                item.style.borderColor = '#2E2E2E';
                item.style.transform = 'translateY(0)';
            };

            item.onclick = () => {
                const targetResource = this.data.resources[entry.targetResource];
                if (targetResource) {
                    this.selectResource(entry.targetResource);
                    this.highlightResourceOnCanvas(entry.targetResource);
                    this.zoomToPhase(entry.targetPhase);

                    // Show animated arrow pointing to entry resource
                    const entryPointData = this.entryPointsData?.find(ep =>
                        ep.targetResource.id === entry.targetResource
                    );
                    if (entryPointData) {
                        setTimeout(() => this.showEntryPointArrow(entryPointData), 500);
                    }
                }
            };

            container.appendChild(item);
        });

        console.log(`Entry points rendered: ${this.data.entryPoints.length}`);
    }

    zoomToPhase(phaseNum) {
        const phaseIndex = this.phases.findIndex(p => p.phase === phaseNum);
        if (phaseIndex === -1) return;

        this.scrollToPhase(phaseIndex);
    }

    highlightResourceOnCanvas(resourceId) {
        // Reset all resources
        d3.selectAll('.resource-card').classed('selected', false);

        // Highlight selected
        d3.select(`[data-resource-id="${resourceId}"]`).classed('selected', true);
    }

    groupResourcesByPhase() {
        const phaseMap = {};
        this.securityResources = []; // Store security resources separately
        this.dataResources = []; // Store data resources separately
        this.commResources = []; // Store communication resources separately
        this.projectManagementResources = []; // Store project management resources separately

        // Define project management resource IDs (ONLY Core layer - API + Lambdas)
        const projectManagementIds = [
            'SCAI-Prod-Core-ProjectManagementAPI',
            'SCAI-Prod-Core-ProjectCRUDHandler',
            'SCAI-Prod-Core-ProjectQueryHandler',
            'SCAI-Prod-Core-ProjectDeletionHandler'
        ];

        Object.values(this.data.resources).forEach(resource => {
            const phase = resource.phase;

            // Separate project management resources (marked with 'project-management' phase)
            if (phase === 'project-management' || projectManagementIds.includes(resource.id)) {
                this.projectManagementResources.push(resource);
                console.log(`📋 Project management resource separated: ${resource.id}`);
                return; // Don't add to phase
            }

            // Skip resources with null phase (not assigned to any phase)
            if (phase === null || phase === undefined) {
                console.warn(`⚠️ Skipping resource with no phase: ${resource.id}`);
                return;
            }

            // Separate security resources (layer 5)
            if (resource.id.includes('-Security-')) {
                this.securityResources.push(resource);
                console.log(`🔒 Security resource separated: ${resource.id}`);
                return; // Don't add to phase
            }

            // Separate data resources (layer 6)
            if (resource.id.includes('-Data-')) {
                this.dataResources.push(resource);
                console.log(`💾 Data resource separated: ${resource.id}`);
                return; // Don't add to phase
            }

            // Separate communication resources (layer 3)
            if (resource.id.includes('-Comm-')) {
                this.commResources.push(resource);
                console.log(`📡 Communication resource separated: ${resource.id}`);
                return; // Don't add to phase
            }

            if (!phaseMap[phase]) {
                const phaseInfo = this.getPhaseInfo(phase);
                phaseMap[phase] = {
                    phase: phase,
                    name: phaseInfo.name,
                    description: phaseInfo.description,
                    executionMode: phaseInfo.executionMode,
                    hasSubPhases: phaseInfo.hasSubPhases || false,
                    subPhases: phaseInfo.subPhases || null,
                    isBranching: phaseInfo.isBranching || false,
                    resources: []
                };
            }
            phaseMap[phase].resources.push(resource);
        });

        // Sort phases (0-7)
        this.phases = Object.values(phaseMap).sort((a, b) => {
            return a.phase - b.phase;
        });

        console.log('Phase distribution:');
        this.phases.forEach(phase => {
            console.log(`  Phase ${phase.phase}: ${phase.resources.length} resources, hasSubPhases: ${phase.hasSubPhases}, isBranching: ${phase.isBranching}`);
        });
        console.log(`📋 Project Management resources: ${this.projectManagementResources.length}`);
        console.log(`🔒 Security resources: ${this.securityResources.length}`);
        console.log(`💾 Data resources: ${this.dataResources.length}`);
        console.log(`📡 Communication resources: ${this.commResources.length}`);
    }

    getPhaseInfo(phaseNum) {
        const phaseData = this.data.processFlow.phases.find(p => p.phase === phaseNum);
        if (phaseData) {
            return phaseData;
        }

        // Handle special phases
        if (phaseNum === 'infrastructure') {
            return {
                name: 'Infrastructure & Monitoring',
                description: 'Cross-cutting infrastructure, monitoring, and alerting resources',
                executionMode: 'always-active'
            };
        }

        // Default for unknown phases
        return {
            name: `Phase ${phaseNum}`,
            description: 'Unknown phase',
            executionMode: 'sequential'
        };
    }

    getTypeLabel(type) {
        const typeLabels = {
            'lambda': 'Lambda Functions',
            'apiGateway': 'API Gateways (REST/HTTP)',
            'apiGatewayWebSocket': 'API Gateway (WebSocket)',
            'dynamodb': 'DynamoDB Tables',
            's3': 'S3 Buckets',
            'sqs': 'SQS Queues',
            'sns': 'SNS Topics',
            'stepFunctions': 'Step Functions',
            'iamRole': 'IAM Roles',
            'secretsManager': 'Secrets Manager',
            'cloudwatchLogGroup': 'CloudWatch Log Groups',
            'cloudwatchAlarm': 'CloudWatch Alarms'
        };
        return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    renderSidebar() {
        const layerNav = document.getElementById('layer-nav');
        layerNav.innerHTML = '';

        // Define layers
        const layers = [
            { id: 1, name: 'Core Layer', color: '#FF6B6B' },
            { id: 2, name: 'Orchestration Layer', color: '#4ECDC4' },
            { id: 3, name: 'Communication Layer', color: '#FFE66D' },
            { id: 4, name: 'Deployment Layer', color: '#95E1D3' },
            { id: 5, name: 'Security Layer', color: '#F38181' },
            { id: 6, name: 'Data Layer', color: '#AA96DA' },
            { id: 7, name: 'Infrastructure & Monitoring', color: '#FFA07A' }
        ];

        layers.forEach(layer => {
            // Group ALL resources from data.resources by layer and phase
            const layerPhases = {};

            // Iterate through ALL resources in the complete dataset
            Object.values(this.data.resources).forEach(resource => {
                if (resource.layer === layer.id && resource.phase !== null && resource.phase !== 'project-management') {
                    if (!layerPhases[resource.phase]) {
                        const phaseInfo = this.getPhaseInfo(resource.phase);
                        layerPhases[resource.phase] = {
                            phase: resource.phase,
                            name: phaseInfo.name,
                            resources: []
                        };
                    }
                    layerPhases[resource.phase].resources.push(resource);
                }
            });

            // Convert to array and sort by phase
            const layerPhasesArray = Object.values(layerPhases).sort((a, b) => a.phase - b.phase);

            if (layerPhasesArray.length === 0) return; // Skip empty layers

            // Create layer container
            const layerDiv = document.createElement('div');
            layerDiv.className = 'nav-layer';

            // Layer header
            const layerHeader = document.createElement('div');
            layerHeader.className = 'nav-layer-header';
            layerHeader.innerHTML = `
                <span class="nav-arrow">▶</span>
                <span>${layer.name}</span>
            `;

            // Layer content (phases)
            const layerContent = document.createElement('div');
            layerContent.style.display = 'none';

            layerPhasesArray.forEach(phaseData => {
                const phaseDiv = document.createElement('div');
                phaseDiv.className = 'nav-phase';

                // Phase header
                const phaseHeader = document.createElement('div');
                phaseHeader.className = 'nav-phase-header';
                const phaseLabel = phaseData.phase === 'infrastructure'
                    ? phaseData.name
                    : `Phase ${phaseData.phase}: ${phaseData.name}`;
                phaseHeader.innerHTML = `
                    <span class="nav-arrow">▶</span>
                    <span>${phaseLabel}</span>
                `;

                // Phase content (resource types)
                const phaseContent = document.createElement('div');
                phaseContent.style.display = 'none';

                // Group resources by type
                const resourcesByType = {};
                phaseData.resources.forEach(resource => {
                    const type = resource.type || 'lambda';
                    if (!resourcesByType[type]) {
                        resourcesByType[type] = [];
                    }
                    resourcesByType[type].push(resource);
                });

                // Create type groups
                Object.keys(resourcesByType).sort().forEach(type => {
                    const typeResources = resourcesByType[type];
                    const typeDiv = document.createElement('div');
                    typeDiv.className = 'nav-type';

                    // Type header with count
                    const typeHeader = document.createElement('div');
                    typeHeader.className = 'nav-type-header';
                    const typeLabel = this.getTypeLabel(type);
                    typeHeader.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="nav-arrow">▶</span>
                            <span>${typeLabel}</span>
                        </div>
                        <span class="nav-type-count">${typeResources.length}</span>
                    `;

                    // Type content (resources)
                    const typeContent = document.createElement('div');
                    typeContent.style.display = 'none';

                    typeResources.forEach(resource => {
                        const resourceDiv = document.createElement('div');
                        resourceDiv.className = 'nav-resource';

                        const resourceItem = document.createElement('div');
                        resourceItem.className = 'nav-resource-item';
                        resourceItem.innerHTML = `
                            <span class="resource-icon">→</span>
                            <span>${resource.name}</span>
                        `;
                        resourceItem.onclick = (e) => {
                            e.stopPropagation();
                            this.selectResource(resource.id);
                            // Update selected state
                            document.querySelectorAll('.nav-resource-item').forEach(el => el.classList.remove('selected'));
                            resourceItem.classList.add('selected');
                        };

                        resourceDiv.appendChild(resourceItem);
                        typeContent.appendChild(resourceDiv);
                    });

                    // Toggle type expand/collapse
                    typeHeader.onclick = (e) => {
                        e.stopPropagation();
                        const isExpanded = typeContent.style.display === 'block';
                        typeContent.style.display = isExpanded ? 'none' : 'block';
                        typeHeader.querySelector('.nav-arrow').classList.toggle('expanded', !isExpanded);
                        typeHeader.classList.toggle('active', !isExpanded);
                    };

                    typeDiv.appendChild(typeHeader);
                    typeDiv.appendChild(typeContent);
                    phaseContent.appendChild(typeDiv);
                });

                // Toggle phase expand/collapse
                phaseHeader.onclick = (e) => {
                    e.stopPropagation();
                    const isExpanded = phaseContent.style.display === 'block';
                    phaseContent.style.display = isExpanded ? 'none' : 'block';
                    phaseHeader.querySelector('.nav-arrow').classList.toggle('expanded', !isExpanded);
                    phaseHeader.classList.toggle('active', !isExpanded);
                };

                phaseDiv.appendChild(phaseHeader);
                phaseDiv.appendChild(phaseContent);
                layerContent.appendChild(phaseDiv);
            });

            // Toggle layer expand/collapse
            layerHeader.onclick = () => {
                const isExpanded = layerContent.style.display === 'block';
                layerContent.style.display = isExpanded ? 'none' : 'block';
                layerHeader.querySelector('.nav-arrow').classList.toggle('expanded', !isExpanded);
                layerHeader.classList.toggle('active', !isExpanded);
            };

            layerDiv.appendChild(layerHeader);
            layerDiv.appendChild(layerContent);
            layerNav.appendChild(layerDiv);
        });

        // Add Project Management Layer (cross-cutting services)
        const projectMgmtResources = Object.values(this.data.resources).filter(r => r.phase === 'project-management');

        if (projectMgmtResources.length > 0) {
            const pmLayerDiv = document.createElement('div');
            pmLayerDiv.className = 'nav-layer';

            const pmLayerHeader = document.createElement('div');
            pmLayerHeader.className = 'nav-layer-header';
            pmLayerHeader.innerHTML = `
                <span class="nav-arrow">▶</span>
                <span>Project Management Layer</span>
            `;

            const pmLayerContent = document.createElement('div');
            pmLayerContent.style.display = 'none';

            // Group by type
            const pmResourcesByType = {};
            projectMgmtResources.forEach(resource => {
                const type = resource.type || 'lambda';
                if (!pmResourcesByType[type]) {
                    pmResourcesByType[type] = [];
                }
                pmResourcesByType[type].push(resource);
            });

            // Create type groups
            Object.keys(pmResourcesByType).sort().forEach(type => {
                const typeResources = pmResourcesByType[type];
                const typeDiv = document.createElement('div');
                typeDiv.className = 'nav-type';
                typeDiv.style.marginLeft = '16px';

                // Type header with count
                const typeHeader = document.createElement('div');
                typeHeader.className = 'nav-type-header';
                const typeLabel = this.getTypeLabel(type);
                typeHeader.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="nav-arrow">▶</span>
                        <span>${typeLabel}</span>
                    </div>
                    <span class="nav-type-count">${typeResources.length}</span>
                `;

                // Type content (resources)
                const typeContent = document.createElement('div');
                typeContent.style.display = 'none';

                typeResources.forEach(resource => {
                    const resourceDiv = document.createElement('div');
                    resourceDiv.className = 'nav-resource';
                    resourceDiv.style.marginLeft = '32px';

                    const resourceItem = document.createElement('div');
                    resourceItem.className = 'nav-resource-item';
                    resourceItem.innerHTML = `
                        <span class="resource-icon">→</span>
                        <span>${resource.name}</span>
                    `;
                    resourceItem.onclick = (e) => {
                        e.stopPropagation();
                        this.selectResource(resource.id);
                        document.querySelectorAll('.nav-resource-item').forEach(el => el.classList.remove('selected'));
                        resourceItem.classList.add('selected');
                    };

                    resourceDiv.appendChild(resourceItem);
                    typeContent.appendChild(resourceDiv);
                });

                // Toggle type expand/collapse
                typeHeader.onclick = (e) => {
                    e.stopPropagation();
                    const isExpanded = typeContent.style.display === 'block';
                    typeContent.style.display = isExpanded ? 'none' : 'block';
                    typeHeader.querySelector('.nav-arrow').classList.toggle('expanded', !isExpanded);
                    typeHeader.classList.toggle('active', !isExpanded);
                };

                typeDiv.appendChild(typeHeader);
                typeDiv.appendChild(typeContent);
                pmLayerContent.appendChild(typeDiv);
            });

            pmLayerHeader.onclick = () => {
                const isExpanded = pmLayerContent.style.display === 'block';
                pmLayerContent.style.display = isExpanded ? 'none' : 'block';
                pmLayerHeader.querySelector('.nav-arrow').classList.toggle('expanded', !isExpanded);
                pmLayerHeader.classList.toggle('active', !isExpanded);
            };

            pmLayerDiv.appendChild(pmLayerHeader);
            pmLayerDiv.appendChild(pmLayerContent);
            layerNav.appendChild(pmLayerDiv);
        }

        document.getElementById('resource-count').textContent = Object.keys(this.data.resources).length;

        // Update header metadata
        if (this.data.version) {
            document.getElementById('version-display').textContent = `v${this.data.version}`;
        }
        if (this.phases.length) {
            document.getElementById('phases-display').textContent = `${this.phases.length} Stages (0 to ${this.phases.length - 1})`;
        }

        // Update resource type summary
        this.renderResourceTypeSummary();
    }

    renderResourceTypeSummary() {
        // Count resources by type
        const typeCounts = {};
        Object.values(this.data.resources).forEach(resource => {
            const type = resource.type || 'unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Sort by count descending
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

        // Populate table
        const table = document.getElementById('type-summary-table');
        table.innerHTML = '';

        sortedTypes.forEach(([type, count]) => {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            const countCell = document.createElement('td');

            labelCell.textContent = this.getTypeLabel(type);
            countCell.textContent = count;

            row.appendChild(labelCell);
            row.appendChild(countCell);
            table.appendChild(row);
        });

        // Update total count
        const totalCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
        document.getElementById('total-resource-count').textContent = totalCount;
    }

    renderCanvas() {
        const svg = d3.select('#svg-canvas');
        svg.selectAll('*').remove();

        // Calculate total dimensions accounting for different phase widths
        let totalWidth = this.config.marginLeft + this.config.marginRight;
        this.phases.forEach((phase, idx) => {
            const phaseWidth = phase.executionMode === 'parallel' ?
                this.config.phaseWidthParallel : this.config.phaseWidth;
            totalWidth += phaseWidth;
            if (idx < this.phases.length - 1) {
                totalWidth += this.config.phaseSpacing;
            }
        });

        const maxResourcesInPhase = Math.max(...this.phases.map(p => p.resources.length));
        const totalHeight = (maxResourcesInPhase * (this.config.resourceHeight + this.config.resourceSpacing)) +
                           this.config.marginTop + this.config.marginBottom;

        svg.attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

        // Create main group for zoom/pan
        const mainGroup = svg.append('g').attr('class', 'main-group');

        // Define gradients and markers
        const defs = svg.append('defs');

        // Card gradient
        const cardGradient = defs.append('linearGradient')
            .attr('id', 'card-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        cardGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#252552')
            .attr('stop-opacity', 1);
        cardGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#1a1a3e')
            .attr('stop-opacity', 1);

        // Phase gradients
        const phaseGradientSeq = defs.append('linearGradient')
            .attr('id', 'phase-gradient-sequential')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        phaseGradientSeq.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(59, 130, 246, 0.08)')
            .attr('stop-opacity', 1);
        phaseGradientSeq.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(59, 130, 246, 0.02)')
            .attr('stop-opacity', 1);

        const phaseGradientPar = defs.append('linearGradient')
            .attr('id', 'phase-gradient-parallel')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        phaseGradientPar.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(168, 85, 247, 0.08)')
            .attr('stop-opacity', 1);
        phaseGradientPar.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(168, 85, 247, 0.02)')
            .attr('stop-opacity', 1);

        const phaseGradientAlways = defs.append('linearGradient')
            .attr('id', 'phase-gradient-always')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        phaseGradientAlways.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(234, 179, 8, 0.08)')
            .attr('stop-opacity', 1);
        phaseGradientAlways.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(234, 179, 8, 0.02)')
            .attr('stop-opacity', 1);

        // Phase -1 (Shared Utilities) gradient
        const phaseGradientShared = defs.append('linearGradient')
            .attr('id', 'phase-gradient-utility')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        phaseGradientShared.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(64, 237, 195, 0.12)')
            .attr('stop-opacity', 1);
        phaseGradientShared.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(127, 251, 169, 0.04)')
            .attr('stop-opacity', 1);

        // Define arrowhead marker
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 9)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 10 3, 0 6')
            .attr('fill', 'rgba(16, 185, 129, 0.6)');

        // Define entry point arrow marker
        defs.append('marker')
            .attr('id', 'entry-arrow')
            .attr('markerWidth', 12)
            .attr('markerHeight', 12)
            .attr('refX', 10)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 12 3, 0 6')
            .attr('fill', '#40EDC3');

        // Define cross-cutting arrow marker (bigger, more prominent)
        defs.append('marker')
            .attr('id', 'cross-cutting-arrowhead')
            .attr('markerWidth', 16)
            .attr('markerHeight', 16)
            .attr('refX', 14)
            .attr('refY', 5)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 16 5, 0 10')
            .attr('fill', 'rgba(255, 255, 255, 0.9)');

        // Define sub-phase arrow marker
        defs.append('marker')
            .attr('id', 'sub-phase-arrow')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 9)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 10 3, 0 6')
            .attr('fill', 'rgba(64, 237, 195, 0.5)');

        // Container for connections (drawn first so they're behind cards)
        this.container = mainGroup.append('g').attr('class', 'connections-container');

        // Draw phases (this calculates and stores phase bounds)
        this.phases.forEach((phase, phaseIndex) => {
            this.drawPhase(mainGroup, phase, phaseIndex);
        });

        // Draw workflow phases wrapper AFTER phases (so we have bounds)
        this.drawWorkflowPhasesWrapper(mainGroup);

        // Draw security resources separately (outside workflow)
        this.drawSecurityResources(mainGroup);

        // Draw data resources separately (outside workflow on the right)
        this.drawDataResources(mainGroup);

        // Draw communication resources separately (outside workflow at the top)
        this.drawCommResources(mainGroup);

        // Draw project management resources separately (outside workflow at the top-left)
        this.drawProjectManagementResources(mainGroup);

        // Draw cross-phase resource interconnections AFTER all resources are rendered
        this.drawCrossPhaseResourceConnections(mainGroup);

        // Draw phase-to-phase connections
        this.drawPhaseConnections();

        // Draw resource connections ONLY within same phase
        this.drawResourceConnections();

        // Setup zoom
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                mainGroup.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Store zoom for external controls
        this.zoom = zoom;
        this.svg = svg;
        this.mainGroup = mainGroup;

        // Draw entry point indicators (after positions are set)
        if (this.data.entryPoints && this.data.entryPoints.length > 0) {
            this.drawEntryPointIndicators(mainGroup);
        }

        // Fit to view on load
        setTimeout(() => this.fitToView(), 100);
    }

    drawPhase(parent, phase, phaseIndex) {
        // Skip configuration phases (they don't execute, just define metadata)
        if (phase.isConfigurationPhase || phase.executionMode === 'configuration') {
            console.log(`⚙️ Skipping configuration phase: ${phase.name}`);
            return;
        }

        // Calculate phase width based on sub-phases
        let phaseWidth = this.config.phaseWidth;
        if (phase.hasSubPhases && phase.subPhases) {
            // For branching: need to account for horizontal spread of branches
            if (phase.isBranching) {
                // 3 columns: Entry, Router, Branches (Manual/Auto aligned vertically)
                const resourceWidth = this.config.resourceWidth;
                const resourceGap = 80;
                phaseWidth = (3 * resourceWidth) + (2 * resourceGap) + 80;
            } else {
                // Sequential sub-phases: VERTICAL layout (label + resource + spacing)
                const labelWidth = 150;
                const resourceWidth = this.config.resourceWidth;
                phaseWidth = labelWidth + resourceWidth + 40; // Label + resource + minimal padding
            }
            console.log(`📦 Phase ${phase.phase} has sub-phases, width: ${phaseWidth}px`);
        } else if (phase.executionMode === 'parallel') {
            phaseWidth = this.config.phaseWidthParallel;
        }

        // Calculate X position accounting for different widths
        let x = this.config.marginLeft;
        for (let i = 0; i < phaseIndex; i++) {
            const prevPhase = this.phases[i];
            // Skip configuration phases in position calculation
            if (prevPhase.isConfigurationPhase || prevPhase.executionMode === 'configuration') {
                continue;
            }
            let prevWidth = this.config.phaseWidth;
            if (prevPhase.hasSubPhases && prevPhase.subPhases) {
                if (prevPhase.isBranching) {
                    const resourceWidth = this.config.resourceWidth;
                    const resourceGap = 80;
                    prevWidth = (3 * resourceWidth) + (2 * resourceGap) + 80;
                } else {
                    // Sequential: vertical layout
                    const labelWidth = 150;
                    const resourceWidth = this.config.resourceWidth;
                    prevWidth = labelWidth + resourceWidth + 40;
                }
            } else if (prevPhase.executionMode === 'parallel') {
                prevWidth = this.config.phaseWidthParallel;
            }
            x += prevWidth + this.config.phaseSpacing;
        }

        // Check if this phase contains Layer 7 resources
        const hasLayer7 = phase.resources.some(r => r.layer === 7);
        const layer7XOffset = hasLayer7 ? 1000 : 0; // Horizontal offset for Infrastructure & Monitoring phase
        const layer7YOffset = hasLayer7 ? 2800 : 0; // Vertical offset for Infrastructure & Monitoring phase

        // Apply horizontal offset for Layer 7 (Infrastructure) phase
        x += layer7XOffset;

        // Calculate phase height (no layer offset for height calculation - keep original)
        let phaseHeight;
        if (phase.hasSubPhases && phase.isBranching) {
            // For branching: height needs to accommodate vertical spread (Manual above, Auto below)
            phaseHeight = 280; // Original height
        } else if (phase.hasSubPhases && !phase.isBranching) {
            // Sequential sub-phases: calculate based on number of resources + spacing
            let totalResourceHeight = 0;
            phase.subPhases.forEach(subPhase => {
                totalResourceHeight += subPhase.services.length * (this.config.resourceHeight + this.config.resourceSpacing);
                totalResourceHeight += 10; // Extra spacing between sub-phases
            });
            phaseHeight = totalResourceHeight + 80; // Original height
        } else {
            phaseHeight = (phase.resources.length * (this.config.resourceHeight + this.config.resourceSpacing)) + 100;
        }

        // FIXED arrow line Y position
        const arrowLineY = this.config.marginTop + 150;

        // Calculate Y position - apply vertical offset for Layer 7 phases
        const y = arrowLineY - (phaseHeight / 2) + 60 + layer7YOffset;

        const phaseGroup = parent.append('g')
            .attr('class', 'phase-column')
            .attr('data-phase', phase.phase);

        // Phase background with color based on execution mode
        const phaseClass = phase.executionMode;
        phaseGroup.append('rect')
            .attr('class', `phase-background ${phaseClass}`)
            .attr('x', x - 10)
            .attr('y', y - 60)
            .attr('width', phaseWidth + 20)
            .attr('height', phaseHeight);

        // Phase title
        const phaseLabel = `Phase ${phase.phase}`;
        phaseGroup.append('text')
            .attr('class', 'phase-title')
            .attr('x', x + phaseWidth / 2)
            .attr('y', y - 35)
            .text(phaseLabel);

        // Phase name
        phaseGroup.append('text')
            .attr('class', 'phase-subtitle')
            .attr('x', x + phaseWidth / 2)
            .attr('y', y - 20)
            .text(phase.name);

        // Execution mode badge
        const modeText = phaseGroup.append('text')
            .attr('class', `phase-execution-mode ${phase.executionMode}`)
            .attr('x', x + phaseWidth / 2)
            .attr('y', y - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(phase.executionMode.toUpperCase());

        // Draw resources - different layouts for sub-phases, parallel, or sequential
        console.log(`🔍 Phase ${phase.phase} - hasSubPhases: ${phase.hasSubPhases}, subPhases:`, phase.subPhases);

        if (phase.hasSubPhases && phase.subPhases) {
            console.log(`✅ Calling drawSubPhases for Phase ${phase.phase}`);
            this.drawSubPhases(phaseGroup, phase, x, y, phaseIndex);
        } else if (phase.executionMode === 'parallel' && phase.resources.length > 1) {
            // Parallel: Treat as TWO sub-phases
            // LEFT sub-phase: Prompt Configurator
            // RIGHT sub-phase: All engines (vertically centered as a group)

            const firstResource = phase.resources[0]; // Prompt Configurator
            const otherResources = phase.resources.slice(1); // All engines

            const subPhaseGap = 80; // Space between the two sub-phases
            const leftSubPhaseWidth = this.config.resourceWidth + 40; // Width for Prompt Config side

            // LEFT sub-phase: Prompt Configurator (vertically centered in phase)
            const totalEngineHeight = otherResources.length * this.config.resourceHeight +
                                     (otherResources.length - 1) * this.config.resourceSpacing;
            const promptConfigY = y + this.config.phasePadding + (totalEngineHeight / 2) - (this.config.resourceHeight / 2);
            const firstResourceX = x + 30;
            this.drawResource(phaseGroup, firstResource, firstResourceX, promptConfigY, phaseIndex, 0);

            // RIGHT sub-phase: All engines stacked vertically
            const engineStartX = x + leftSubPhaseWidth + subPhaseGap;
            otherResources.forEach((resource, idx) => {
                const engineY = y + this.config.phasePadding + (idx * (this.config.resourceHeight + this.config.resourceSpacing));
                this.drawResource(phaseGroup, resource, engineStartX, engineY, phaseIndex, idx + 1);
            });
        } else {
            // Sequential/Always-Active: Resources stacked vertically, but NOT centered - positioned to LEFT
            // This leaves horizontal space on the RIGHT for routing arrows
            phase.resources.forEach((resource, resIndex) => {
                const resourceY = y + this.config.phasePadding + (resIndex * (this.config.resourceHeight + this.config.resourceSpacing));
                // Position resources on the LEFT side of the phase box (not centered)
                const resourceX = x + this.config.phasePadding;
                this.drawResource(phaseGroup, resource, resourceX, resourceY, phaseIndex, resIndex);
            });
        }

        // Store phase bounds for later use
        phase._bounds = {
            x: x,
            y: y,
            width: phaseWidth,
            height: phaseHeight
        };
    }

    drawBranchingSubPhases(parent, phase, phaseX, phaseY, phaseIndex) {
        const resourceWidth = this.config.resourceWidth;
        const resourceGap = 80;
        let resourceIndexCounter = 0;

        // Find the router and branch sub-phases
        const entrySubPhase = phase.subPhases.find(sp => sp.name === "Entry Point");
        const routerSubPhase = phase.subPhases.find(sp => sp.branchesTo);
        const topBranch = phase.subPhases.find(sp => sp.branchPosition === "top");
        const bottomBranch = phase.subPhases.find(sp => sp.branchPosition === "bottom");

        // Calculate total width: 3 resource columns with 2 gaps
        const totalContentWidth = (3 * resourceWidth) + (2 * resourceGap);
        const phaseWidth = totalContentWidth + 80; // Match drawPhase calculation

        // Start X position: center the content within the phase box
        const startX = phaseX + (phaseWidth - totalContentWidth) / 2;

        const baseY = phaseY + this.config.phasePadding + 20;
        let currentX = startX;

        // Store resource positions for arrows
        const positions = {};

        // Draw Entry Point (left)
        const entryX = currentX;
        let entryY = baseY;

        if (entrySubPhase.services && entrySubPhase.services.length > 0) {
            const resource = phase.resources.find(r => r.id === entrySubPhase.services[0]);
            if (resource) {
                entryY = baseY;

                parent.append('text')
                    .attr('x', entryX + resourceWidth / 2)
                    .attr('y', entryY - 10)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '9px')
                    .attr('font-weight', '700')
                    .attr('fill', '#40EDC3')
                    .text(entrySubPhase.name.toUpperCase());

                this.drawResource(parent, resource, entryX, entryY, phaseIndex, resourceIndexCounter);
                positions.entry = { x: entryX, y: entryY + this.config.resourceHeight / 2, width: resourceWidth };
                resourceIndexCounter++;
            }
        }

        // Draw Router (middle-left)
        currentX += resourceWidth + resourceGap;
        const routerX = currentX;
        let routerY = baseY;

        if (routerSubPhase.services && routerSubPhase.services.length > 0) {
            const resource = phase.resources.find(r => r.id === routerSubPhase.services[0]);
            if (resource) {
                routerY = baseY;

                parent.append('text')
                    .attr('x', routerX + resourceWidth / 2)
                    .attr('y', routerY - 10)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '9px')
                    .attr('font-weight', '700')
                    .attr('fill', '#40EDC3')
                    .text(routerSubPhase.name.toUpperCase());

                this.drawResource(parent, resource, routerX, routerY, phaseIndex, resourceIndexCounter);
                positions.router = { x: routerX, y: routerY + this.config.resourceHeight / 2, width: resourceWidth };
                resourceIndexCounter++;
            }
        }

        // Draw Manual Path (top right)
        currentX += resourceWidth + resourceGap;
        const topBranchX = currentX;
        let topBranchY = baseY - 60;

        if (topBranch.services && topBranch.services.length > 0) {
            const resource = phase.resources.find(r => r.id === topBranch.services[0]);
            if (resource) {
                topBranchY = baseY - 60;

                parent.append('text')
                    .attr('x', topBranchX + resourceWidth / 2)
                    .attr('y', topBranchY - 10)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '9px')
                    .attr('font-weight', '700')
                    .attr('fill', '#40EDC3')
                    .text(topBranch.name.toUpperCase());

                this.drawResource(parent, resource, topBranchX, topBranchY, phaseIndex, resourceIndexCounter);
                positions.topBranch = { x: topBranchX, y: topBranchY + this.config.resourceHeight / 2, width: resourceWidth };
                resourceIndexCounter++;
            }
        }

        // Draw Auto Path (bottom right - aligned horizontally with Manual)
        const bottomBranchX = topBranchX;
        let bottomBranchY = baseY + 60;

        if (bottomBranch.services && bottomBranch.services.length > 0) {
            const resource = phase.resources.find(r => r.id === bottomBranch.services[0]);
            if (resource) {
                bottomBranchY = baseY + 60;

                parent.append('text')
                    .attr('x', bottomBranchX + resourceWidth / 2)
                    .attr('y', bottomBranchY - 10)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '9px')
                    .attr('font-weight', '700')
                    .attr('fill', '#40EDC3')
                    .text(bottomBranch.name.toUpperCase());

                this.drawResource(parent, resource, bottomBranchX, bottomBranchY, phaseIndex, resourceIndexCounter);
                positions.bottomBranch = { x: bottomBranchX, y: bottomBranchY + this.config.resourceHeight / 2, width: resourceWidth };
            }
        }

        // Draw arrows
        if (positions.entry && positions.router) {
            parent.append('line')
                .attr('x1', positions.entry.x + positions.entry.width)
                .attr('y1', positions.entry.y)
                .attr('x2', positions.router.x)
                .attr('y2', positions.router.y)
                .attr('stroke', 'rgba(64, 237, 195, 0.6)')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#sub-phase-arrow)');
        }

        // Router → Manual Path (curved up)
        if (positions.router && positions.topBranch) {
            const midX = positions.router.x + positions.router.width + 30;
            const path1 = `M ${positions.router.x + positions.router.width} ${positions.router.y}
                           L ${midX} ${positions.router.y}
                           Q ${midX + 20} ${positions.router.y}, ${midX + 20} ${positions.router.y - 20}
                           L ${midX + 20} ${positions.topBranch.y}
                           L ${positions.topBranch.x} ${positions.topBranch.y}`;

            parent.append('path')
                .attr('d', path1)
                .attr('stroke', 'rgba(64, 237, 195, 0.6)')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('marker-end', 'url(#sub-phase-arrow)');
        }

        // Router → Auto Path (curved down)
        if (positions.router && positions.bottomBranch) {
            const midX = positions.router.x + positions.router.width + 30;
            const path2 = `M ${positions.router.x + positions.router.width} ${positions.router.y}
                           L ${midX} ${positions.router.y}
                           Q ${midX + 20} ${positions.router.y}, ${midX + 20} ${positions.router.y + 20}
                           L ${midX + 20} ${positions.bottomBranch.y}
                           L ${positions.bottomBranch.x} ${positions.bottomBranch.y}`;

            parent.append('path')
                .attr('d', path2)
                .attr('stroke', 'rgba(64, 237, 195, 0.6)')
                .attr('stroke-width', 2)
                .attr('fill', 'none')
                .attr('marker-end', 'url(#sub-phase-arrow)');
        }
    }



    drawSubPhases(parent, phase, phaseX, phaseY, phaseIndex) {
        console.log(`🎯 Drawing sub-phases for Phase ${phase.phase}:`, phase.subPhases.map(sp => sp.name));

        // Check if this phase has branching logic
        if (phase.isBranching) {
            this.drawBranchingSubPhases(parent, phase, phaseX, phaseY, phaseIndex);
            return;
        }

        // Sequential sub-phases: VERTICAL alignment with sub-phase labels on the left
        const resourceWidth = this.config.resourceWidth;
        const resourceHeight = this.config.resourceHeight;
        const resourceSpacing = this.config.resourceSpacing;
        const labelWidth = 150; // Width for sub-phase labels on the left

        let resourceIndexCounter = 0;
        const resourcePositions = [];

        // Calculate total height needed for all resources
        let totalHeight = 0;
        phase.subPhases.forEach(subPhase => {
            totalHeight += subPhase.services.length * (resourceHeight + resourceSpacing);
            totalHeight += 10; // Extra spacing between sub-phases
        });

        // Get actual phase bounds
        const phaseHeight = phase._bounds ? phase._bounds.height : totalHeight + 80;

        // Center resources vertically within the phase box
        const startY = phaseY + (phaseHeight - totalHeight) / 2;
        let currentY = startY;

        // Center resources horizontally within the phase box
        const phaseWidth = labelWidth + resourceWidth + 100;
        const contentWidth = labelWidth + resourceWidth; // Total width of label + resource
        const horizontalOffset = (phaseWidth - contentWidth) / 2;
        const labelX = phaseX + horizontalOffset;
        const resourceX = labelX + labelWidth;

        phase.subPhases.forEach((subPhase, subPhaseIndex) => {
            // Draw sub-phase label on the LEFT (using centered labelX)
            parent.append('text')
                .attr('x', labelX)
                .attr('y', currentY + resourceHeight / 2 + 5)
                .attr('text-anchor', 'start')
                .attr('font-size', '10px')
                .attr('font-weight', '700')
                .attr('fill', '#40EDC3')
                .attr('letter-spacing', '0.5px')
                .text(subPhase.name.toUpperCase());

            // Draw resources vertically
            subPhase.services.forEach((serviceId, idx) => {
                const resource = phase.resources.find(r => r.id === serviceId);
                if (resource) {
                    this.drawResource(parent, resource, resourceX, currentY, phaseIndex, resourceIndexCounter);

                    // Store position for arrows
                    resourcePositions.push({
                        x: resourceX,
                        y: currentY + resourceHeight / 2,
                        width: resourceWidth,
                        height: resourceHeight
                    });

                    resourceIndexCounter++;
                    currentY += resourceHeight + resourceSpacing;
                }
            });

            // Add extra spacing between sub-phases
            currentY += 10;
        });

        // Draw VERTICAL arrows between resources - straight down from bottom of one to top of next
        for (let i = 0; i < resourcePositions.length - 1; i++) {
            const from = resourcePositions[i];
            const to = resourcePositions[i + 1];

            // Draw straight vertical arrow from center bottom of resource to center top of next resource
            const arrowX = from.x + from.width / 2;
            const fromY = from.y + from.height / 2;
            const toY = to.y - to.height / 2;

            parent.append('line')
                .attr('x1', arrowX)
                .attr('y1', fromY)
                .attr('x2', arrowX)
                .attr('y2', toY)
                .attr('stroke', 'rgba(64, 237, 195, 0.6)')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#sub-phase-arrow)');
        }
    }

    drawResource(parent, resource, x, y, phaseIndex, resIndex) {
        const group = parent.append('g')
            .attr('class', 'resource-card')
            .attr('data-resource-id', resource.id)
            .style('cursor', 'pointer')
            .on('click', () => this.selectResource(resource.id));

        // Create clipPath to prevent text overflow
        const clipId = `clip-${resource.id}`;
        parent.append('defs').append('clipPath')
            .attr('id', clipId)
            .append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', this.config.resourceWidth)
            .attr('height', this.config.resourceHeight)
            .attr('rx', 8);

        // Apply clipping to group
        group.attr('clip-path', `url(#${clipId})`);

        // Resource rectangle
        group.append('rect')
            .attr('class', 'resource-rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', this.config.resourceWidth)
            .attr('height', this.config.resourceHeight);

        // Get AWS service info
        const awsService = this.getAWSServiceIcon(resource.type);

        // AWS Service icon (SVG image from CDN)
        if (awsService.iconUrl) {
            group.append('image')
                .attr('class', 'aws-service-icon')
                .attr('x', x + 6)
                .attr('y', y + 6)
                .attr('width', 36)
                .attr('height', 36)
                .attr('href', awsService.iconUrl)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .style('opacity', '0.9');
        }

        // AWS Service name text (simple text style)
        group.append('text')
            .attr('class', 'aws-service-badge')
            .attr('x', x + 8)
            .attr('y', y + this.config.resourceHeight - 8)
            .text(`AWS ${awsService.name}`);

        // Resource name - simplified and centered
        // Extract service name from ID: SCAI-Prod-Core-ContentEntryAPI → Content Entry API
        let displayName = resource.name;
        const nameParts = resource.id.split('-');
        if (nameParts.length >= 4) {
            // Get the last part after SCAI-Prod-Layer-
            const serviceName = nameParts.slice(3).join('');
            // Add spaces before capital letters: ContentEntryAPI → Content Entry API
            displayName = serviceName.replace(/([A-Z])/g, ' $1').trim();
        }

        // Full name, centered, multi-line if needed
        const nameLines = this.wrapText(displayName, 16);
        nameLines.forEach((line, i) => {
            group.append('text')
                .attr('class', 'resource-name')
                .attr('x', x + this.config.resourceWidth / 2)
                .attr('y', y + 26 + (i * 12))
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .text(line);
        });


        // Store position for connections
        resource._position = {
            x: x,
            y: y,
            centerX: x + this.config.resourceWidth / 2,
            centerY: y + this.config.resourceHeight / 2,
            bottomY: y + this.config.resourceHeight,
            phaseIndex: phaseIndex,
            resIndex: resIndex
        };
    }

    drawCrossPhaseResourceConnections(parent) {
        // Create a group for resource connections (behind resources)
        const connectionsGroup = parent.insert('g', ':first-child')
            .attr('class', 'resource-connections-group');

        // Iterate through all resources and draw their connections
        Object.values(this.data.resources).forEach(resource => {
            if (!resource._position || !resource.connections) return;

            const fromPos = resource._position;

            // Draw outbound connections
            if (resource.connections.outbound) {
                resource.connections.outbound.forEach(conn => {
                    const targetResource = this.data.resources[conn.target];
                    if (!targetResource || !targetResource._position) return;

                    const toPos = targetResource._position;

                    // Draw curved line from source to target
                    const fromX = fromPos.centerX;
                    const fromY = fromPos.centerY;
                    const toX = toPos.centerX;
                    const toY = toPos.centerY;

                    // Calculate control points for bezier curve
                    const dx = toX - fromX;
                    const dy = toY - fromY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Control point offset based on distance
                    const offset = Math.min(distance * 0.5, 200);

                    const cp1X = fromX + offset;
                    const cp1Y = fromY;
                    const cp2X = toX - offset;
                    const cp2Y = toY;

                    // Draw the connection path
                    connectionsGroup.append('path')
                        .attr('class', 'resource-connection-line')
                        .attr('d', `M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`)
                        .attr('stroke', 'rgba(64, 237, 195, 0.3)')
                        .attr('stroke-width', 2)
                        .attr('fill', 'none')
                        .attr('marker-end', 'url(#resource-arrow)');

                    // Add label in the middle of the connection
                    const midX = (fromX + toX) / 2;
                    const midY = (fromY + toY) / 2;

                    if (conn.label) {
                        connectionsGroup.append('text')
                            .attr('class', 'resource-connection-label')
                            .attr('x', midX)
                            .attr('y', midY - 5)
                            .attr('text-anchor', 'middle')
                            .attr('font-size', '9px')
                            .attr('fill', '#40EDC3')
                            .attr('opacity', 0.7)
                            .text(conn.label);
                    }
                });
            }
        });

        // Add arrow marker for resource connections
        const defs = parent.select('defs');
        if (defs.empty()) {
            parent.append('defs');
        }

        parent.select('defs').append('marker')
            .attr('id', 'resource-arrow')
            .attr('class', 'resource-connection-arrow')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 8)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .attr('markerUnits', 'strokeWidth')
            .append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .attr('fill', 'rgba(64, 237, 195, 0.6)');
    }

    getAWSServiceIcon(resourceType) {
        // Using icon.icepanel.io CDN for AWS service icons
        // Map both lowercase type IDs and human-readable types
        const typeString = String(resourceType || '').toLowerCase();

        const serviceMap = {
            'lambda': {
                name: 'Lambda',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg',
                color: '#FF9900'
            },
            'lambda function': {
                name: 'Lambda',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg',
                color: '#FF9900'
            },
            'dynamodb': {
                name: 'DynamoDB',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
                color: '#4053D6'
            },
            'dynamodb table': {
                name: 'DynamoDB',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
                color: '#4053D6'
            },
            's3': {
                name: 'S3',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg',
                color: '#569A31'
            },
            's3 bucket': {
                name: 'S3',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg',
                color: '#569A31'
            },
            'apigateway': {
                name: 'API Gateway',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            },
            'api gateway': {
                name: 'API Gateway',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            },
            'api gateway + lambda': {
                name: 'API Gateway',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            },
            'websocketapi': {
                name: 'WebSocket',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            },
            'api gateway websocket': {
                name: 'WebSocket',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            },
            'stepfunctions': {
                name: 'Step Functions',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg',
                color: '#D93553'
            },
            'step functions': {
                name: 'Step Functions',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg',
                color: '#D93553'
            },
            'step functions state machine': {
                name: 'Step Functions',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg',
                color: '#D93553'
            },
            'sqs': {
                name: 'SQS',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
                color: '#FF4F8B'
            },
            'sqs queue': {
                name: 'SQS',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
                color: '#FF4F8B'
            },
            'sqsfifo': {
                name: 'SQS FIFO',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
                color: '#FF4F8B'
            },
            'sqs fifo queue': {
                name: 'SQS FIFO',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg',
                color: '#FF4F8B'
            },
            'secretsmanager': {
                name: 'Secrets Manager',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Secrets-Manager.svg',
                color: '#DD344C'
            },
            'aws secrets manager': {
                name: 'Secrets Manager',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Secrets-Manager.svg',
                color: '#DD344C'
            },
            'iamrole': {
                name: 'IAM Role',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Identity-and-Access-Management.svg',
                color: '#DD344C'
            },
            'iam role': {
                name: 'IAM Role',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Identity-and-Access-Management.svg',
                color: '#DD344C'
            },
            'sns': {
                name: 'SNS',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg',
                color: '#FF4F8B'
            },
            'sns topic': {
                name: 'SNS',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg',
                color: '#FF4F8B'
            },
            'cloudwatchloggroup': {
                name: 'CloudWatch Logs',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
                color: '#FF4F8B'
            },
            'cloudwatch log group': {
                name: 'CloudWatch Logs',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
                color: '#FF4F8B'
            },
            'cloudwatchalarm': {
                name: 'CloudWatch Alarm',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
                color: '#E7157B'
            },
            'cloudwatch alarm': {
                name: 'CloudWatch Alarm',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
                color: '#E7157B'
            },
            'apigatewaywebsocket': {
                name: 'API Gateway',
                iconUrl: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
                color: '#FF4F8B'
            }
        };

        return serviceMap[typeString] || {
            name: 'Service',
            iconUrl: 'https://icon.icepanel.io/AWS/svg/Cloud/Cloud.svg',
            color: '#FF9900'
        };
    }

    wrapText(text, maxLength) {
        if (text.length <= maxLength) return [text];
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + ' ' + word).trim().length <= maxLength) {
                currentLine = (currentLine + ' ' + word).trim();
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) lines.push(currentLine);
        return lines.slice(0, 2); // Max 2 lines
    }

    drawWorkflowPhasesWrapper(parent) {
        // Draw a wrapper box around ALL workflow stages (0-7)
        const workflowPhases = this.phases.filter(p => p.phase >= 0 && p.phase <= 7);

        if (workflowPhases.length === 0) return;

        // Calculate bounds for all workflow phases
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        workflowPhases.forEach(phase => {
            if (phase._bounds) {
                const b = phase._bounds;
                minX = Math.min(minX, b.x - 40);
                minY = Math.min(minY, b.y - 120);
                maxX = Math.max(maxX, b.x + b.width + 40);
                maxY = Math.max(maxY, b.y + b.height + 40);
            }
        });

        // Check if we got valid bounds
        if (!isFinite(minX) || !isFinite(minY)) return;

        // Store bounds for later use (arrows to box)
        this.workflowBoxBounds = { minX, minY, maxX, maxY };
        this.workflowBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            bottomY: maxY
        };

        // Insert wrapper rectangle at the beginning (behind everything)
        const wrapper = parent.insert('g', ':first-child')
            .attr('class', 'workflow-wrapper-group');

        wrapper.append('rect')
            .attr('class', 'workflow-wrapper-rect')
            .attr('x', minX)
            .attr('y', minY)
            .attr('width', maxX - minX)
            .attr('height', maxY - minY)
            .attr('rx', 16)
            .attr('ry', 16)
            .attr('fill', 'rgba(25, 25, 25, 0.6)')
            .attr('stroke', 'rgba(255, 255, 255, 0.4)')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '15, 8')
            .attr('opacity', 1);

        // Add prominent label for wrapper at the top
        wrapper.append('text')
            .attr('x', minX + 30)
            .attr('y', minY + 30)
            .attr('fill', 'rgba(255, 255, 255, 0.85)')
            .attr('font-size', '16px')
            .attr('font-weight', '700')
            .attr('letter-spacing', '2px')
            .text('CONTENT GENERATION WORKFLOW');
    }

    // Removed: No Phase -1 (Shared Utilities) or Phase 7 cross-cutting concerns in this architecture

    drawPhase1ToWorkflowConnection(parent) {
        // Draw arrow from Phase -1 to workflow box
        const phase1 = this.phases.find(p => p.phase === -1);
        if (!phase1 || !phase1._bounds) return;

        const boxBounds = this.workflowBoxBounds;
        const p1Bounds = phase1._bounds;
        const p1RightX = p1Bounds.x + p1Bounds.width;
        const p1CenterY = p1Bounds.y + p1Bounds.height / 2;
        const boxLeftX = boxBounds.minX;
        const boxCenterY = (boxBounds.minY + boxBounds.maxY) / 2;

        this.drawCrossCuttingArrow(parent,
            p1RightX, p1CenterY,
            boxLeftX, boxCenterY,
            'rgba(64, 237, 195, 0.8)',
            'SHARED UTILITIES'
        );
    }

    drawPhase0ToWorkflowConnection(parent) {
        // Draw arrow from Phase 0 to workflow box
        const phase0 = this.phases.find(p => p.phase === 0);
        if (!phase0 || !phase0._bounds) return;

        const boxBounds = this.workflowBoxBounds;
        const p0Bounds = phase0._bounds;
        const p0RightX = p0Bounds.x + p0Bounds.width;
        const p0CenterY = p0Bounds.y + p0Bounds.height / 2;
        const boxLeftX = boxBounds.minX;
        const boxCenterY = (boxBounds.minY + boxBounds.maxY) / 2;

        this.drawCrossCuttingArrow(parent,
            p0RightX, p0CenterY,
            boxLeftX, boxCenterY,
            'rgba(100, 181, 246, 0.8)',
            'ENTRY & ROUTING'
        );
    }

    drawPhase7ToWorkflowConnection(parent) {
        // Draw arrow from Phase 7 to workflow box
        const phase7 = this.phases.find(p => p.phase === 7);
        if (!phase7 || !phase7._bounds) return;

        const boxBounds = this.workflowBoxBounds;
        const p7Bounds = phase7._bounds;
        const p7LeftX = p7Bounds.x;
        const p7CenterY = p7Bounds.y + p7Bounds.height / 2;
        const boxRightX = boxBounds.maxX;
        const boxCenterY = (boxBounds.minY + boxBounds.maxY) / 2;

        this.drawCrossCuttingArrow(parent,
            p7LeftX, p7CenterY,
            boxRightX, boxCenterY,
            'rgba(234, 179, 8, 0.8)',
            'MONITORING'
        );
    }

    drawCrossCuttingArrow(parent, fromX, fromY, toX, toY, color, label) {
        // Draw a prominent arrow showing cross-cutting concern connection

        // Arrow line
        const line = parent.append('line')
            .attr('class', 'cross-cutting-arrow')
            .attr('x1', fromX)
            .attr('y1', fromY)
            .attr('x2', toX)
            .attr('y2', toY)
            .attr('stroke', color)
            .attr('stroke-width', 4)
            .attr('stroke-dasharray', '10, 6')
            .attr('opacity', 0.9)
            .attr('marker-end', 'url(#cross-cutting-arrowhead)');

        // Label background
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;

        const labelGroup = parent.append('g')
            .attr('class', 'cross-cutting-label');

        labelGroup.append('rect')
            .attr('x', midX - 60)
            .attr('y', midY - 15)
            .attr('width', 120)
            .attr('height', 30)
            .attr('rx', 6)
            .attr('fill', 'rgba(18, 18, 18, 0.9)')
            .attr('stroke', color)
            .attr('stroke-width', 2);

        labelGroup.append('text')
            .attr('x', midX)
            .attr('y', midY + 5)
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .attr('letter-spacing', '1px')
            .text(label);

        // Hover effect
        line.on('mouseenter', function() {
            d3.select(this).attr('opacity', 1).attr('stroke-width', 5);
        }).on('mouseleave', function() {
            d3.select(this).attr('opacity', 0.9).attr('stroke-width', 4);
        });
    }

    drawSecurityResources(parent) {
        if (!this.securityResources || this.securityResources.length === 0) return;

        console.log(`🔒 Drawing ${this.securityResources.length} security resources`);

        // Position security resources BELOW and ALIGNED with workflow wrapper center
        const securityY = this.config.marginTop + 1500; // Extremely far below - completely outside workflow
        const resourceGap = 20;

        // Calculate security box width first
        const totalWidth = (this.securityResources.length * this.config.resourceWidth) +
                          ((this.securityResources.length - 1) * resourceGap) + 40;

        // Center security box horizontally with workflow box so connection is straight
        const securityX = this.workflowBounds ? (this.workflowBounds.centerX - totalWidth / 2) : this.config.marginLeft + 50;

        parent.append('rect')
            .attr('x', securityX - 20)
            .attr('y', securityY - 40)
            .attr('width', totalWidth)
            .attr('height', this.config.resourceHeight + 80)
            .attr('rx', 12)
            .attr('fill', 'rgba(255, 165, 0, 0.05)')
            .attr('stroke', 'rgba(255, 165, 0, 0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5, 5');

        // Label
        parent.append('text')
            .attr('x', securityX)
            .attr('y', securityY - 20)
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('fill', 'rgba(255, 165, 0, 0.9)')
            .text('SECURITY LAYER');

        // Draw security resources horizontally
        let currentX = securityX;
        this.securityResources.forEach((resource, index) => {
            this.drawResource(parent, resource, currentX, securityY, -1, index);

            // Store position
            resource._position = {
                x: currentX,
                y: securityY,
                centerX: currentX + this.config.resourceWidth / 2,
                centerY: securityY + this.config.resourceHeight / 2
            };

            currentX += this.config.resourceWidth + resourceGap;
        });

        // Store security box bounds for connection
        this.securityBoxBounds = {
            x: securityX - 20,
            y: securityY - 40,
            width: totalWidth,
            height: this.config.resourceHeight + 80,
            centerX: securityX - 20 + totalWidth / 2,
            topY: securityY - 40
        };

        // Draw single connection from security box to workflow box
        this.drawSecurityConnections(parent);
    }

    drawSecurityConnections(parent) {
        if (!this.securityBoxBounds || !this.workflowBounds) return;

        // Draw SINGLE line from center top of security box to center bottom of workflow box
        const fromX = this.securityBoxBounds.centerX;
        const fromY = this.securityBoxBounds.topY;
        const toX = this.workflowBounds.centerX;
        const toY = this.workflowBounds.bottomY;

        parent.append('line')
            .attr('x1', fromX)
            .attr('y1', fromY)
            .attr('x2', toX)
            .attr('y2', toY)
            .attr('stroke', 'rgba(255, 165, 0, 0.6)')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8, 4');

        // Add label on the connection
        const midY = (fromY + toY) / 2;
        parent.append('text')
            .attr('x', fromX + 10)
            .attr('y', midY)
            .attr('font-size', '10px')
            .attr('fill', 'rgba(255, 165, 0, 0.8)')
            .text('Security Services');
    }

    drawCommResources(parent) {
        if (!this.commResources || this.commResources.length === 0) return;

        console.log(`📡 Drawing ${this.commResources.length} communication resources`);

        // Position communication resources ABOVE the workflow wrapper
        if (!this.workflowBounds) return;

        const commY = this.workflowBounds.y - 200; // Above workflow
        const resourceGap = 20;

        // Draw communication resources horizontally
        const totalWidth = (this.commResources.length * this.config.resourceWidth) +
                          ((this.commResources.length - 1) * resourceGap) + 40;

        // Center horizontally with workflow box
        const commX = this.workflowBounds.centerX - totalWidth / 2;

        // Draw container box for communication resources
        parent.append('rect')
            .attr('x', commX - 20)
            .attr('y', commY - 40)
            .attr('width', totalWidth)
            .attr('height', this.config.resourceHeight + 80)
            .attr('rx', 12)
            .attr('fill', 'rgba(144, 238, 144, 0.05)')
            .attr('stroke', 'rgba(144, 238, 144, 0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5, 5');

        // Label
        parent.append('text')
            .attr('x', commX)
            .attr('y', commY - 20)
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('fill', 'rgba(144, 238, 144, 0.9)')
            .text('COMMUNICATION LAYER');

        // Draw communication resources horizontally
        let currentX = commX;
        this.commResources.forEach((resource, index) => {
            this.drawResource(parent, resource, currentX, commY, -1, index);

            // Store position
            resource._position = {
                x: currentX,
                y: commY,
                centerX: currentX + this.config.resourceWidth / 2,
                centerY: commY + this.config.resourceHeight / 2
            };

            currentX += this.config.resourceWidth + resourceGap;
        });

        // Store comm box bounds for connection
        this.commBoxBounds = {
            x: commX - 20,
            y: commY - 40,
            width: totalWidth,
            height: this.config.resourceHeight + 80,
            centerX: commX - 20 + totalWidth / 2,
            bottomY: commY - 40 + this.config.resourceHeight + 80
        };

        // Draw single connection from comm box to workflow box
        this.drawCommConnections(parent);
    }

    drawCommConnections(parent) {
        if (!this.commBoxBounds || !this.workflowBounds) return;

        // Draw SINGLE line from bottom of comm box to top of workflow box
        const fromX = this.commBoxBounds.centerX;
        const fromY = this.commBoxBounds.bottomY;
        const toX = this.workflowBounds.centerX;
        const toY = this.workflowBounds.y;

        parent.append('line')
            .attr('x1', fromX)
            .attr('y1', fromY)
            .attr('x2', toX)
            .attr('y2', toY)
            .attr('stroke', 'rgba(144, 238, 144, 0.6)')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8, 4');

        // Add label on the connection
        const midY = (fromY + toY) / 2;
        parent.append('text')
            .attr('x', fromX + 10)
            .attr('y', midY)
            .attr('font-size', '10px')
            .attr('fill', 'rgba(144, 238, 144, 0.8)')
            .text('Notifications');
    }

    drawProjectManagementResources(parent) {
        if (!this.projectManagementResources || this.projectManagementResources.length === 0) return;

        console.log(`📋 Drawing ${this.projectManagementResources.length} project management resources`);

        // Position project management resources at TOP-LEFT of workflow wrapper
        if (!this.workflowBounds) return;

        const projectY = this.workflowBounds.y - 450; // Move up even higher
        const resourceGap = 20;

        // Draw project management resources horizontally
        const totalWidth = (this.projectManagementResources.length * this.config.resourceWidth) +
                          ((this.projectManagementResources.length - 1) * resourceGap) + 40;

        // Position to the LEFT side - align with left edge of workflow
        const projectX = this.workflowBounds.x; // Align with workflow left edge

        // Draw container box for project management resources
        parent.append('rect')
            .attr('x', projectX - 20)
            .attr('y', projectY - 40)
            .attr('width', totalWidth)
            .attr('height', this.config.resourceHeight + 80)
            .attr('rx', 12)
            .attr('fill', 'rgba(186, 85, 211, 0.05)')
            .attr('stroke', 'rgba(186, 85, 211, 0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5, 5');

        // Label
        parent.append('text')
            .attr('x', projectX)
            .attr('y', projectY - 20)
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('fill', 'rgba(186, 85, 211, 0.9)')
            .text('PROJECT MANAGEMENT');

        // Draw project management resources horizontally
        let currentX = projectX;
        this.projectManagementResources.forEach((resource, index) => {
            this.drawResource(parent, resource, currentX, projectY, -1, index);

            // Store position
            resource._position = {
                x: currentX,
                y: projectY,
                centerX: currentX + this.config.resourceWidth / 2,
                centerY: projectY + this.config.resourceHeight / 2
            };

            currentX += this.config.resourceWidth + resourceGap;
        });

        // Store project management box bounds for connection
        this.projectManagementBoxBounds = {
            x: projectX - 20,
            y: projectY - 40,
            width: totalWidth,
            height: this.config.resourceHeight + 80,
            centerX: projectX - 20 + totalWidth / 2,
            bottomY: projectY - 40 + this.config.resourceHeight + 80
        };

        // Draw single connection from project management box to workflow box
        this.drawProjectManagementConnections(parent);
    }

    drawProjectManagementConnections(parent) {
        if (!this.projectManagementBoxBounds || !this.workflowBounds) return;

        // Draw SINGLE STRAIGHT VERTICAL line from bottom of PM box to top of workflow box
        const fromX = this.projectManagementBoxBounds.x + this.projectManagementBoxBounds.width / 2;
        const fromY = this.projectManagementBoxBounds.y + this.projectManagementBoxBounds.height;
        const toX = fromX; // Keep same X for straight vertical line
        const toY = this.workflowBounds.y;

        parent.append('line')
            .attr('x1', fromX)
            .attr('y1', fromY)
            .attr('x2', toX)
            .attr('y2', toY)
            .attr('stroke', 'rgba(186, 85, 211, 0.6)')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8, 4');

        // Add label on the connection
        const midY = (fromY + toY) / 2;
        parent.append('text')
            .attr('x', fromX + 15)
            .attr('y', midY)
            .attr('font-size', '10px')
            .attr('fill', 'rgba(186, 85, 211, 0.8)')
            .text('Project CRUD');
    }

    drawDataResources(parent) {
        if (!this.dataResources || this.dataResources.length === 0) return;

        console.log(`💾 Drawing ${this.dataResources.length} data resources`);

        // Position data resources to the RIGHT of the workflow wrapper
        if (!this.workflowBounds) return;

        const dataX = this.workflowBounds.x + this.workflowBounds.width + 100; // Right side, outside workflow
        const resourceGap = 15;

        // Stack data resources vertically
        const totalHeight = (this.dataResources.length * this.config.resourceHeight) +
                           ((this.dataResources.length - 1) * resourceGap) + 80;

        // Center vertically with workflow
        const dataY = this.workflowBounds.y + (this.workflowBounds.height - totalHeight) / 2;

        // Draw container box for data resources
        parent.append('rect')
            .attr('x', dataX - 20)
            .attr('y', dataY - 40)
            .attr('width', this.config.resourceWidth + 40)
            .attr('height', totalHeight)
            .attr('rx', 12)
            .attr('fill', 'rgba(100, 149, 237, 0.05)')
            .attr('stroke', 'rgba(100, 149, 237, 0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5, 5');

        // Label
        parent.append('text')
            .attr('x', dataX)
            .attr('y', dataY - 20)
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('fill', 'rgba(100, 149, 237, 0.9)')
            .text('DATA LAYER');

        // Draw data resources vertically
        let currentY = dataY;
        this.dataResources.forEach((resource, index) => {
            this.drawResource(parent, resource, dataX, currentY, -1, index);

            // Store position
            resource._position = {
                x: dataX,
                y: currentY,
                centerX: dataX + this.config.resourceWidth / 2,
                centerY: currentY + this.config.resourceHeight / 2
            };

            currentY += this.config.resourceHeight + resourceGap;
        });

        // Store data box bounds for connection
        this.dataBoxBounds = {
            x: dataX - 20,
            y: dataY - 40,
            width: this.config.resourceWidth + 40,
            height: totalHeight,
            centerY: dataY - 40 + totalHeight / 2,
            leftX: dataX - 20
        };

        // Draw single connection from data box to workflow box
        this.drawDataConnections(parent);
    }

    drawDataConnections(parent) {
        if (!this.dataBoxBounds || !this.workflowBounds) return;

        // Draw SINGLE line from left of data box to right of workflow box
        const fromX = this.dataBoxBounds.leftX;
        const fromY = this.dataBoxBounds.centerY;
        const toX = this.workflowBounds.x + this.workflowBounds.width;
        const toY = this.workflowBounds.y + this.workflowBounds.height / 2;

        parent.append('line')
            .attr('x1', fromX)
            .attr('y1', fromY)
            .attr('x2', toX)
            .attr('y2', toY)
            .attr('stroke', 'rgba(100, 149, 237, 0.6)')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8, 4');

        // Add label on the connection
        const midX = (fromX + toX) / 2;
        parent.append('text')
            .attr('x', midX)
            .attr('y', fromY - 10)
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(100, 149, 237, 0.8)')
            .text('Data Storage');
    }

    drawSubPhaseToSubPhaseConnection(fromPhase, toPhase) {
        // Phase 0 → Phase 1: Connect phase boxes (not resources)
        console.log(`🔗 Drawing sub-phase to sub-phase: Phase ${fromPhase.phase} → Phase ${toPhase.phase}`);

        const fromBounds = fromPhase._bounds;
        const toBounds = toPhase._bounds;

        if (!fromBounds || !toBounds) return;

        // Arrow from right edge of fromPhase box to left edge of toPhase box
        const fixedY = this.config.marginTop + 150;
        const x1 = fromBounds.x + fromBounds.width + 10;
        const x2 = toBounds.x - 10;

        this.container.append('line')
            .attr('class', 'phase-connection')
            .attr('x1', x1)
            .attr('y1', fixedY)
            .attr('x2', x2)
            .attr('y2', fixedY)
            .attr('stroke', 'rgba(64, 237, 195, 0.6)')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
    }

    drawSubPhaseToRegularConnection(fromPhase, toPhase) {
        // From sub-phase to regular phase - connect boxes
        console.log(`🔗 Drawing sub-phase to regular: Phase ${fromPhase.phase} → Phase ${toPhase.phase}`);

        const fromBounds = fromPhase._bounds;
        const toBounds = toPhase._bounds;

        if (!fromBounds || !toBounds) return;

        const fixedY = this.config.marginTop + 150;
        const x1 = fromBounds.x + fromBounds.width + 10;
        const x2 = toBounds.x - 10;

        this.container.append('line')
            .attr('class', 'phase-connection')
            .attr('x1', x1)
            .attr('y1', fixedY)
            .attr('x2', x2)
            .attr('y2', fixedY)
            .attr('stroke', 'rgba(64, 237, 195, 0.6)')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
    }

    drawRegularToSubPhaseConnection(fromPhase, toPhase) {
        // From regular phase to sub-phase - connect boxes
        console.log(`🔗 Drawing regular to sub-phase: Phase ${fromPhase.phase} → Phase ${toPhase.phase}`);

        const fromBounds = fromPhase._bounds;
        const toBounds = toPhase._bounds;

        if (!fromBounds || !toBounds) return;

        const fixedY = this.config.marginTop + 150;
        const x1 = fromBounds.x + fromBounds.width + 10;
        const x2 = toBounds.x - 10;

        this.container.append('line')
            .attr('class', 'phase-connection')
            .attr('x1', x1)
            .attr('y1', fixedY)
            .attr('x2', x2)
            .attr('y2', fixedY)
            .attr('stroke', 'rgba(64, 237, 195, 0.6)')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
    }

    drawPhaseConnections() {
        // Draw HORIZONTAL arrows ONLY between workflow phases (0→1→2→3→4→5→6→7)

        // Use a fixed Y position for all phase connections (middle of viewport)
        const fixedY = this.config.marginTop + 150;

        for (let i = 0; i < this.phases.length - 1; i++) {
            const currentPhase = this.phases[i];
            const nextPhase = this.phases[i + 1];

            // Handle connections between sub-phase stages
            if (currentPhase.hasSubPhases && nextPhase.hasSubPhases) {
                this.drawSubPhaseToSubPhaseConnection(currentPhase, nextPhase);
                continue;
            } else if (currentPhase.hasSubPhases && !nextPhase.hasSubPhases) {
                this.drawSubPhaseToRegularConnection(currentPhase, nextPhase);
                continue;
            } else if (!currentPhase.hasSubPhases && nextPhase.hasSubPhases) {
                this.drawRegularToSubPhaseConnection(currentPhase, nextPhase);
                continue;
            } else if (currentPhase.hasSubPhases || nextPhase.hasSubPhases) {
                console.log(`⏭️ Skipping phase arrow from ${currentPhase.phase} to ${nextPhase.phase} (has sub-phases)`);
                continue;
            }

            const currentBounds = currentPhase._bounds;
            const nextBounds = nextPhase._bounds;

            if (!currentBounds || !nextBounds) continue;

            // X positions: from right edge of current phase to left edge of next phase
            const x1 = currentBounds.x + currentBounds.width + 10;
            const x2 = nextBounds.x - 10;

            // Draw horizontal line at FIXED Y position (all arrows at same height)
            this.container.append('line')
                .attr('class', 'phase-connection')
                .attr('x1', x1)
                .attr('y1', fixedY)
                .attr('x2', x2)
                .attr('y2', fixedY)
                .attr('marker-end', 'url(#arrowhead)');
        }
    }

    drawResourceConnections() {
        let connectionsDrawn = 0;

        // Draw connections ONLY within each phase (no cross-phase connections)
        this.phases.forEach((phase, phaseIndex) => {
            // SKIP phases with sub-phases - they handle their own internal arrows
            if (phase.hasSubPhases) {
                console.log(`⏭️ Skipping resource connections for Phase ${phase.phase} (has sub-phases - handles own arrows)`);
                return;
            }

            const resources = phase.resources;

            if (resources.length <= 1) return; // No connections for single resource

            // FIRST: Try to draw connections based on actual connection data (works for all phases)
            resources.forEach(sourceResource => {
                if (!sourceResource._position || !sourceResource.connections?.outbound) return;

                sourceResource.connections.outbound.forEach(conn => {
                    // Only draw if target is in SAME phase
                    const targetResource = resources.find(r => r.id === conn.target);
                    if (targetResource && targetResource._position) {
                        this.drawConnection(sourceResource, targetResource, 'data-driven');
                        connectionsDrawn++;
                    }
                });
            });

            // THEN: For sequential/parallel phases, add additional layout-based connections
            if (phase.executionMode === 'sequential') {
                // Sequential: Connect resources by executionOrder
                const sortedResources = [...resources].sort((a, b) => {
                    const orderA = a.executionOrder || 999;
                    const orderB = b.executionOrder || 999;
                    return orderA - orderB;
                });

                // Draw arrow from each resource to the next
                for (let i = 0; i < sortedResources.length - 1; i++) {
                    const source = sortedResources[i];
                    const target = sortedResources[i + 1];

                    if (source._position && target._position) {
                        this.drawConnection(source, target, 'sequential');
                        connectionsDrawn++;
                    }
                }
            } else if (phase.executionMode === 'parallel') {
                // Parallel: Simple direct lines from Prompt Config center to each engine center
                // NO overlap - each line goes straight horizontally

                if (resources.length > 1) {
                    const firstResource = resources[0]; // Prompt Configurator
                    const otherResources = resources.slice(1); // Engines

                    const startX = firstResource._position.x + this.config.resourceWidth; // Right edge of Prompt Config
                    const startY = firstResource._position.centerY; // Center of Prompt Config

                    // Draw individual line to EACH engine
                    otherResources.forEach((target) => {
                        if (target._position) {
                            const targetX = target._position.x; // Left edge of engine
                            const targetY = target._position.centerY; // Center of engine

                            // Simple path: horizontal from Prompt Config, then vertical, then horizontal to engine
                            const midX = (startX + targetX) / 2;

                            const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${targetY} L ${targetX} ${targetY}`;

                            this.container.append('path')
                                .attr('class', 'connection-line parallel-individual')
                                .attr('d', path)
                                .attr('stroke', 'rgba(168, 85, 247, 0.4)')
                                .attr('stroke-width', 1.5)
                                .attr('fill', 'none')
                                .attr('marker-end', 'url(#arrowhead)');

                            connectionsDrawn++;
                        }
                    });
                }
            }
            // For 'always-active': No connections (independent resources)
        });

        console.log(`Within-phase resource connections drawn: ${connectionsDrawn}`);
    }

    drawEntryPointIndicators(parent) {
        if (!this.data.entryPoints) return;

        // Create a separate layer for entry point arrows
        this.entryPointArrowLayer = parent.append('g')
            .attr('class', 'entry-point-arrows-layer')
            .style('pointer-events', 'none');

        // Store entry point data for dynamic arrow drawing
        this.entryPointsData = [];

        // Group entry points by target resource to handle overlaps
        const entryPointsByTarget = {};
        this.data.entryPoints.forEach(entry => {
            const targetId = entry.targetResource;
            if (!entryPointsByTarget[targetId]) {
                entryPointsByTarget[targetId] = [];
            }
            entryPointsByTarget[targetId].push(entry);
        });

        // Track which resources are entry points (only 2: Phase 0 and Phase 1 starts)
        const uniqueTargets = Object.keys(entryPointsByTarget);

        // Store for later use
        uniqueTargets.forEach(targetId => {
            const entries = entryPointsByTarget[targetId];
            const targetResource = this.data.resources[targetId];
            if (targetResource && targetResource._position) {
                this.entryPointsData.push({
                    targetResource: targetResource,
                    entries: entries
                });
            }
        });

        console.log(`Entry points prepared: ${this.entryPointsData.length} unique targets`);
    }

    showEntryPointArrow(entryPointData) {
        // Clear any existing arrows
        this.entryPointArrowLayer.selectAll('*').remove();

        const pos = entryPointData.targetResource._position;
        const startX = pos.x - 80;
        const startY = pos.centerY;
        const endX = pos.x - 10;
        const endY = pos.centerY;

        // Draw animated arrow
        const arrow = this.entryPointArrowLayer.append('line')
            .attr('x1', startX)
            .attr('y1', startY)
            .attr('x2', startX) // Start from same position
            .attr('y2', startY)
            .attr('stroke', '#40EDC3')
            .attr('stroke-width', 3)
            .attr('marker-end', 'url(#entry-arrow)')
            .attr('opacity', 0);

        // Animate arrow appearing
        arrow.transition()
            .duration(300)
            .attr('x2', endX)
            .attr('y2', endY)
            .attr('opacity', 1)
            .transition()
            .delay(1500)
            .duration(500)
            .attr('opacity', 0)
            .remove();

        // Add entry point labels
        entryPointData.entries.forEach((entry, idx) => {
            const label = this.entryPointArrowLayer.append('text')
                .attr('x', startX - 10)
                .attr('y', startY + (idx * 18) - (entryPointData.entries.length * 9))
                .attr('text-anchor', 'end')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('fill', '#40EDC3')
                .text(`${entry.symbol} ${entry.name}`)
                .attr('opacity', 0);

            // Animate label
            label.transition()
                .duration(300)
                .attr('opacity', 1)
                .transition()
                .delay(1500)
                .duration(500)
                .attr('opacity', 0)
                .remove();
        });
    }

    drawConnection(source, target, type = 'sequential') {
        const samePhase = source._position.phaseIndex === target._position.phaseIndex;

        // Choose style based on connection type
        let strokeColor, strokeWidth, strokeDash;

        switch(type) {
            case 'sequential':
            case 'data-driven':
                strokeColor = 'rgba(16, 185, 129, 0.7)';
                strokeWidth = 2.5;
                strokeDash = 'none';
                break;
            case 'parallel-out':
            case 'parallel-in':
                strokeColor = 'rgba(16, 185, 129, 0.4)';
                strokeWidth = 1.5;
                strokeDash = 'none';
                break;
            case 'cross-phase':
                strokeColor = 'rgba(16, 185, 129, 0.25)';
                strokeWidth = 1.5;
                strokeDash = '5,3';
                break;
            default:
                strokeColor = 'rgba(16, 185, 129, 0.5)';
                strokeWidth = 2;
                strokeDash = 'none';
        }

        if (!samePhase) {
            // Should not happen - we don't draw cross-phase connections
            return;
        }

        // Determine routing based on relative positions
        const sourcePos = source._position;
        const targetPos = target._position;

        // Calculate start and end points
        let startX, startY, endX, endY;

        // Determine the best connection points based on relative positions
        const isTargetBelow = targetPos.y > sourcePos.y;
        const isTargetRight = targetPos.x > sourcePos.x;
        const isTargetLeft = targetPos.x < sourcePos.x;

        if (isTargetBelow && Math.abs(targetPos.x - sourcePos.x) < 50) {
            // Target is directly below - simple vertical line
            startX = sourcePos.centerX;
            startY = sourcePos.y + this.config.resourceHeight;
            endX = targetPos.centerX;
            endY = targetPos.y;

            this.container.append('line')
                .attr('class', 'connection-line')
                .attr('x1', startX)
                .attr('y1', startY)
                .attr('x2', endX)
                .attr('y2', endY)
                .attr('stroke', strokeColor)
                .attr('stroke-width', strokeWidth)
                .attr('stroke-dasharray', strokeDash)
                .attr('marker-end', 'url(#arrowhead)');
        } else if (isTargetRight || isTargetLeft) {
            // Target is to the side - L-shaped path (horizontal then vertical)
            startX = sourcePos.x + (isTargetRight ? this.config.resourceWidth : 0);
            startY = sourcePos.centerY;
            endX = targetPos.x + (isTargetRight ? 0 : this.config.resourceWidth);
            endY = targetPos.centerY;

            const midX = (startX + endX) / 2;

            // Draw L-shaped path: horizontal → vertical → horizontal
            const path = `M ${startX} ${startY}
                         L ${midX} ${startY}
                         L ${midX} ${endY}
                         L ${endX} ${endY}`;

            this.container.append('path')
                .attr('class', 'connection-line-routed')
                .attr('d', path)
                .attr('stroke', strokeColor)
                .attr('stroke-width', strokeWidth)
                .attr('stroke-dasharray', strokeDash)
                .attr('fill', 'none')
                .attr('marker-end', 'url(#arrowhead)');
        } else {
            // Target is below and to the side - curved path
            startX = sourcePos.centerX;
            startY = sourcePos.y + this.config.resourceHeight;
            endX = targetPos.centerX;
            endY = targetPos.y;

            const midY = (startY + endY) / 2;

            const path = `M ${startX} ${startY}
                         L ${startX} ${midY}
                         L ${endX} ${midY}
                         L ${endX} ${endY}`;

            this.container.append('path')
                .attr('class', 'connection-line-routed')
                .attr('d', path)
                .attr('stroke', strokeColor)
                .attr('stroke-width', strokeWidth)
                .attr('stroke-dasharray', strokeDash)
                .attr('fill', 'none')
                .attr('marker-end', 'url(#arrowhead)');
        }
    }

    selectResource(resourceId) {
        this.selectedResource = this.data.resources[resourceId];

        // Update visual selection
        d3.selectAll('.resource-card').classed('selected', false);
        d3.selectAll('.resource-item').classed('selected', false);

        d3.select(`[data-resource-id="${resourceId}"]`).classed('selected', true);

        // Update sidebar
        const sidebarItems = document.querySelectorAll('.resource-item');
        sidebarItems.forEach(item => {
            if (item.textContent === this.selectedResource.name) {
                item.classList.add('selected');
            }
        });

        // Zoom to resource
        this.zoomToResource(resourceId);

        // Show details panel
        this.showDetailsPanel();
    }

    zoomToResource(resourceId) {
        const resource = this.data.resources[resourceId];
        if (!resource) return;

        // Find the resource's position in the visualization
        const resourceElement = d3.select(`[data-resource-id="${resourceId}"]`);
        if (resourceElement.empty()) return;

        // Get resource position from the rect element
        const rect = resourceElement.select('.resource-rect');
        if (rect.empty()) return;

        const x = parseFloat(rect.attr('x'));
        const y = parseFloat(rect.attr('y'));
        const width = parseFloat(rect.attr('width'));
        const height = parseFloat(rect.attr('height'));

        const svg = d3.select('#svg-canvas');
        const svgWidth = svg.node().clientWidth;
        const svgHeight = svg.node().clientHeight;

        // Zoom scale - zoom in to focus on the resource
        const scale = 1.5;

        // Center the resource in the viewport
        const translateX = svgWidth / 2 - (x + width / 2) * scale;
        const translateY = svgHeight / 2 - (y + height / 2) * scale;

        svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    }

    showDetailsPanel() {
        const panel = document.getElementById('details-panel');
        const resource = this.selectedResource;

        document.getElementById('details-resource-name').textContent = resource.name;

        let content = `
            <div class="details-section">
                <div class="detail-row">
                    <span class="detail-label">Resource ID</span>
                    <span class="detail-value" style="font-family: monospace; font-size: 11px; color: #10B981;">${resource.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phase</span>
                    <span class="detail-value">Phase ${resource.phase !== null ? resource.phase : '7'}${resource.phase === -1 ? ' (Shared Utilities)' : ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${resource.type || 'N/A'}</span>
                </div>
                ${resource.executionOrder ? `
                <div class="detail-row">
                    <span class="detail-label">Execution Order</span>
                    <span class="detail-value">${resource.executionOrder}</span>
                </div>
                ` : ''}
            </div>

            <div class="details-section">
                <h3>Description</h3>
                <p>${resource.description || 'No description available'}</p>
            </div>
        `;

        // Purpose
        if (resource.purpose) {
            content += `
                <div class="details-section">
                    <h3>Purpose</h3>
                    <p>${resource.purpose}</p>
                </div>
            `;
        }

        // Functions
        if (resource.functions && resource.functions.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Functions</h3>
                    <ul class="capabilities-list">
                        ${resource.functions.map(fn => `<li>${fn}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Capabilities (legacy support)
        if (resource.capabilities && resource.capabilities.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Capabilities</h3>
                    <ul class="capabilities-list">
                        ${resource.capabilities.map(cap => `<li>${cap}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Input Specification
        if (resource.metadata && resource.metadata.input) {
            const input = resource.metadata.input;
            content += `
                <div class="details-section">
                    <h3>📥 Input</h3>
                    <div style="background: #191919; border: 1px solid #2E2E2E; border-radius: 6px; padding: 12px;">
                        <div class="detail-row">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${input.type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Format</span>
                            <span class="detail-value">${input.format}</span>
                        </div>
                        ${input.fields ? `
                            <div style="margin-top: 10px;">
                                <div style="font-size: 11px; color: #9C9C9C; margin-bottom: 6px; font-weight: 600;">Fields:</div>
                                <div style="font-family: monospace; font-size: 11px; color: #10B981;">
                                    ${Object.entries(input.fields).map(([key, value]) => `
                                        <div style="margin-bottom: 4px; padding: 4px 8px; background: #0F0F0F; border-radius: 4px;">
                                            <span style="color: #40EDC3;">${key}:</span> <span style="color: #9C9C9C;">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Output Specification
        if (resource.metadata && resource.metadata.output) {
            const output = resource.metadata.output;
            content += `
                <div class="details-section">
                    <h3>📤 Output</h3>
                    <div style="background: #191919; border: 1px solid #2E2E2E; border-radius: 6px; padding: 12px;">
                        <div class="detail-row">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${output.type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Format</span>
                            <span class="detail-value">${output.format}</span>
                        </div>
                        ${output.fields ? `
                            <div style="margin-top: 10px;">
                                <div style="font-size: 11px; color: #9C9C9C; margin-bottom: 6px; font-weight: 600;">Fields:</div>
                                <div style="font-family: monospace; font-size: 11px; color: #10B981;">
                                    ${Object.entries(output.fields).map(([key, value]) => `
                                        <div style="margin-bottom: 4px; padding: 4px 8px; background: #0F0F0F; border-radius: 4px;">
                                            <span style="color: #40EDC3;">${key}:</span> <span style="color: #9C9C9C;">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Table Attributes (for DynamoDB tables)
        if (resource.schema && resource.schema.attributes) {
            content += `
                <div class="details-section">
                    <h3>Table Attributes</h3>
                    <div style="background: #191919; border: 1px solid #2E2E2E; border-radius: 6px; padding: 12px;">
                        <div style="font-family: monospace; font-size: 11px; color: #10B981;">
                            ${Object.entries(resource.schema.attributes).map(([key, value]) => `
                                <div style="margin-bottom: 6px; padding: 6px 8px; background: #0F0F0F; border-radius: 4px; border-left: 3px solid #40EDC3;">
                                    <div style="color: #40EDC3; font-weight: 600; margin-bottom: 2px;">${key}</div>
                                    <div style="color: #9C9C9C; font-size: 10px;">${value}</div>
                                </div>
                            `).join('')}
                        </div>
                        ${resource.schema.PK ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #2E2E2E;">
                                <div class="detail-row">
                                    <span class="detail-label">Partition Key</span>
                                    <span class="detail-value" style="color: #10B981;">${resource.schema.PK}</span>
                                </div>
                                ${resource.schema.SK ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Sort Key</span>
                                        <span class="detail-value" style="color: #10B981;">${resource.schema.SK}</span>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Inbound Connections
        if (resource.connections && resource.connections.inbound && resource.connections.inbound.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Inbound Connections (${resource.connections.inbound.length})</h3>
            `;
            resource.connections.inbound.forEach((conn, idx) => {
                const sourceExists = this.data.resources[conn.source];
                const clickableClass = sourceExists ? 'connection-clickable' : '';
                const cursorStyle = sourceExists ? 'cursor: pointer;' : '';
                const hoverStyle = sourceExists ? 'transition: all 0.2s;' : '';

                content += `
                    <div class="${clickableClass}" data-resource-id="${conn.source}" style="background: #191919; border: 1px solid #2E2E2E; border-radius: 6px; padding: 10px; margin-bottom: 8px; ${cursorStyle} ${hoverStyle}">
                        <div style="font-size: 12px; font-weight: 600; color: #40EDC3; margin-bottom: 4px;">← ${conn.source}</div>
                        ${conn.label ? `<div style="font-size: 11px; color: #9C9C9C; margin-bottom: 2px;">Label: ${conn.label}</div>` : ''}
                        ${conn.dataType ? `<div style="font-size: 11px; color: #9C9C9C; margin-bottom: 2px;">Data: ${conn.dataType}</div>` : ''}
                        ${conn.protocol ? `<div style="font-size: 11px; color: #9C9C9C;">Protocol: ${conn.protocol}</div>` : ''}
                    </div>
                `;
            });
            content += `</div>`;
        }

        // Outbound Connections
        if (resource.connections && resource.connections.outbound && resource.connections.outbound.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Outbound Connections (${resource.connections.outbound.length})</h3>
            `;
            resource.connections.outbound.forEach((conn, idx) => {
                const targetExists = this.data.resources[conn.target];
                const clickableClass = targetExists ? 'connection-clickable' : '';
                const cursorStyle = targetExists ? 'cursor: pointer;' : '';
                const hoverStyle = targetExists ? 'transition: all 0.2s;' : '';

                content += `
                    <div class="${clickableClass}" data-resource-id="${conn.target}" style="background: #191919; border: 1px solid #2E2E2E; border-radius: 6px; padding: 10px; margin-bottom: 8px; ${cursorStyle} ${hoverStyle}">
                        <div style="font-size: 12px; font-weight: 600; color: #40EDC3; margin-bottom: 4px;">→ ${conn.target}</div>
                        ${conn.label ? `<div style="font-size: 11px; color: #9C9C9C; margin-bottom: 2px;">Label: ${conn.label}</div>` : ''}
                        ${conn.dataType ? `<div style="font-size: 11px; color: #9C9C9C; margin-bottom: 2px;">Data: ${conn.dataType}</div>` : ''}
                        ${conn.protocol ? `<div style="font-size: 11px; color: #9C9C9C;">Protocol: ${conn.protocol}</div>` : ''}
                        ${conn.operation ? `<div style="font-size: 11px; color: #9C9C9C;">Operation: ${conn.operation}</div>` : ''}
                    </div>
                `;
            });
            content += `</div>`;
        }

        // Legacy triggers support
        if (resource.triggers && resource.triggers.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Triggers</h3>
                    <ul class="capabilities-list">
                        ${resource.triggers.map(t => `<li>${t}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Legacy outputs support
        if (resource.outputs && resource.outputs.length > 0) {
            content += `
                <div class="details-section">
                    <h3>Outputs</h3>
                    <ul class="capabilities-list">
                        ${resource.outputs.map(o => `<li>${o}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        document.getElementById('tab-overview').innerHTML = content;

        // Populate CloudFormation tab
        const cfTab = document.getElementById('tab-cloudformation');
        if (window.cloudformationTemplate && window.cloudformationTemplate.Resources) {
            // Sanitize resource ID to match CloudFormation naming (remove hyphens, capitalize)
            const sanitizedId = resource.id.replace(/-/g, '');
            const cfResource = window.cloudformationTemplate.Resources[sanitizedId];

            if (cfResource) {
                cfTab.innerHTML = `
                    <div class="cf-resource-info">
                        <div class="label">CloudFormation Resource</div>
                        <div class="value">${sanitizedId}</div>
                    </div>
                    <div class="cf-resource-info">
                        <div class="label">AWS Resource Type</div>
                        <div class="value">${cfResource.Type || 'N/A'}</div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button class="copy-btn" onclick="copyCloudFormationCode('${sanitizedId}')">Copy JSON</button>
                        <div style="clear: both;"></div>
                    </div>
                    <div class="cf-code-block">
                        <pre>${syntaxHighlightJSON(JSON.stringify(cfResource, null, 2))}</pre>
                    </div>
                `;
            } else {
                cfTab.innerHTML = `
                    <div class="cf-not-available">
                        <p>CloudFormation definition not available for this resource.</p>
                        <p style="margin-top: 8px; font-size: 11px;">Resource ID: ${resource.id}</p>
                        <p style="font-size: 11px;">Sanitized ID: ${sanitizedId}</p>
                    </div>
                `;
            }
        } else {
            cfTab.innerHTML = `
                <div class="cf-not-available">
                    <p>CloudFormation template not loaded.</p>
                    <p style="margin-top: 8px; font-size: 11px;">Make sure aws-scai-infrastructure-cloudformation-template.json is in the same directory.</p>
                </div>
            `;
        }

        panel.classList.add('visible');

        // Add click handlers for connection items
        setTimeout(() => {
            document.querySelectorAll('.connection-clickable').forEach(elem => {
                elem.addEventListener('click', () => {
                    const targetId = elem.getAttribute('data-resource-id');
                    if (targetId && this.data.resources[targetId]) {
                        this.selectResource(targetId);
                        this.highlightResourceOnCanvas(targetId);

                        // Zoom to the target resource's phase
                        const targetResource = this.data.resources[targetId];
                        if (targetResource && targetResource.phase !== null) {
                            this.zoomToPhase(targetResource.phase);
                        }
                    }
                });

                // Add hover effects
                elem.addEventListener('mouseenter', () => {
                    elem.style.background = '#2E2E2E';
                    elem.style.borderColor = '#40EDC3';
                });

                elem.addEventListener('mouseleave', () => {
                    elem.style.background = '#191919';
                    elem.style.borderColor = '#2E2E2E';
                });
            });
        }, 0);
    }

    scrollToPhase(phaseIndex) {
        const x = this.config.marginLeft + (phaseIndex * (this.config.phaseWidth + this.config.phaseSpacing));
        const y = this.config.marginTop;

        const svg = d3.select('#svg-canvas');
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;

        const scale = 1;
        const translateX = width / 2 - x * scale - this.config.phaseWidth / 2 * scale;
        const translateY = height / 2 - y * scale;

        svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    }

    fitToView() {
        const svg = d3.select('#svg-canvas');
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;

        const totalWidth = (this.phases.length * this.config.phaseWidth) +
                          ((this.phases.length - 1) * this.config.phaseSpacing) +
                          this.config.marginLeft + this.config.marginRight;

        const maxResourcesInPhase = Math.max(...this.phases.map(p => p.resources.length));
        const totalHeight = (maxResourcesInPhase * (this.config.resourceHeight + this.config.resourceSpacing)) +
                           this.config.marginTop + this.config.marginBottom;

        const scaleX = width / totalWidth;
        const scaleY = height / totalHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9;

        const translateX = (width - totalWidth * scale) / 2;
        const translateY = (height - totalHeight * scale) / 2;

        svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
    }

    resetZoom() {
        const svg = d3.select('#svg-canvas');
        svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity
        );
    }

    showAllPhases() {
        // Store current filter state
        this.selectedPhaseFilter = null;

        // Re-render everything
        this.renderCanvas();
    }

    showSinglePhase(phaseNum) {
        // Store selected phase
        this.selectedPhaseFilter = phaseNum;

        // Filter phases to only show selected one
        const originalPhases = this.phases;
        this.phases = originalPhases.filter(p => p.phase === phaseNum);

        // Re-render canvas with only selected phase
        const svg = d3.select('#svg-canvas');
        svg.selectAll('*').remove();

        // Calculate dimensions for single phase
        const phaseWidth = this.phases[0].executionMode === 'parallel' ?
            this.config.phaseWidthParallel : this.config.phaseWidth;

        const phaseHeight = (this.phases[0].resources.length * (this.config.resourceHeight + this.config.resourceSpacing)) + 100;

        const totalWidth = this.config.marginLeft + phaseWidth + this.config.marginRight;
        const totalHeight = this.config.marginTop + phaseHeight + this.config.marginBottom + 200;

        svg.attr('width', totalWidth).attr('height', totalHeight);

        // Create main group
        const mainGroup = svg.append('g').attr('class', 'main-group');

        // Define gradients and markers
        const defs = mainGroup.append('defs');

        // Phase gradient
        const phaseGradient = defs.append('linearGradient')
            .attr('id', 'phase-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        phaseGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', 'rgba(16, 185, 129, 0.08)')
            .attr('stop-opacity', 1);
        phaseGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', 'rgba(16, 185, 129, 0.02)')
            .attr('stop-opacity', 1);

        // Arrowhead marker
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('markerWidth', 10)
            .attr('markerHeight', 10)
            .attr('refX', 9)
            .attr('refY', 3)
            .attr('orient', 'auto')
            .append('polygon')
            .attr('points', '0 0, 10 3, 0 6')
            .attr('fill', 'rgba(16, 185, 129, 0.6)');

        // Container for connections
        this.container = mainGroup.append('g').attr('class', 'connections-container');

        // Draw the single phase
        this.drawPhase(mainGroup, this.phases[0], 0);

        // Draw resource connections within the phase
        this.drawResourceConnections();

        // Setup zoom
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                mainGroup.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Store zoom for external controls
        this.zoom = zoom;
        this.svg = svg;
        this.mainGroup = mainGroup;

        // Restore original phases array
        this.phases = originalPhases;

        // Fit to view
        setTimeout(() => this.fitToView(), 100);
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function closeDetailsPanel() {
  document.getElementById('details-panel').classList.remove('visible');
}

function fitToView() {
  if (window.explorer) {
    window.explorer.fitToView();
  }
}

function resetZoom() {
  if (window.explorer) {
    window.explorer.resetZoom();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');

  sidebar.classList.toggle('collapsed');

  if (sidebar.classList.contains('collapsed')) {
    toggleBtn.style.display = 'flex';
  } else {
    toggleBtn.style.display = 'none';
  }
}

// Tab switching function
function switchTab(tabName) {
  // Remove active class from all tabs and contents
  document.querySelectorAll('.details-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  // Add active class to selected tab and content
  document.querySelector(`.details-tab:nth-child(${tabName === 'overview' ? 1 : 2})`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// JSON syntax highlighting function
function syntaxHighlightJSON(json) {
  json = JSON.stringify(json, null, 2);
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

// Copy CloudFormation code to clipboard
function copyCloudFormationCode(resourceId) {
  const cfTemplate = window.cloudformationTemplate;
  if (!cfTemplate || !cfTemplate.Resources) {
    return;
  }

  const resourceDef = cfTemplate.Resources[resourceId];
  if (!resourceDef) {
    return;
  }

  const code = JSON.stringify(resourceDef, null, 2);

  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function toggleConnections() {
  window.connectionsVisible = !window.connectionsVisible;

  const connections = document.querySelectorAll('.connection-line, .resource-connection-line, .resource-connection-label, .resource-connection-arrow, .connection-line-cross-phase');
  const statusText = document.getElementById('connections-status');
  const toggleBtn = document.getElementById('toggle-connections-btn');

  connections.forEach(conn => {
    if (window.connectionsVisible) {
      conn.classList.remove('hidden');
    } else {
      conn.classList.add('hidden');
    }
  });

  // Update button text and style
  if (window.connectionsVisible) {
    statusText.textContent = 'Connections: ON';
    toggleBtn.style.background = '#10B981';
    toggleBtn.style.color = '#FFFFFF';
  } else {
    statusText.textContent = 'Connections: OFF';
    toggleBtn.style.background = '#2E2E2E';
    toggleBtn.style.color = '#9C9C9C';
  }
}

// Initialize connections visibility
window.connectionsVisible = true;

export default Explorer;
