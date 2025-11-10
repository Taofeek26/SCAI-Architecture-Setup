import { useEffect, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import * as d3 from 'd3';
import './Diagram.css';
import { OverviewTab, ConnectionsTab, RequirementsTab, ConfigurationTab, CodeTab } from './DetailPanelContent';
import { getAWSServiceIcon } from '../utils/awsServiceIcons';

const Diagram = () => {
  const { isDataLoaded, architectureData, processData, cloudformationData } = useData();
  const svgRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [expandedLayers, setExpandedLayers] = useState(new Set());
  const [showConnections, setShowConnections] = useState(true);

  // Process architecture data and extract layer information
  const processArchitectureData = (data) => {
    if (!data || !data.services) return { layers: [], services: [], connections: [] };

    const layers = {};
    const services = [];
    const connections = [];

    // Create layer definitions from architecture data if available
    const layerDefinitions = {};
    if (data.layers && Array.isArray(data.layers)) {
      data.layers.forEach(layer => {
        layerDefinitions[layer.id] = {
          number: layer.id,
          name: layer.name,
          color: layer.color,
          description: layer.description,
          services: []
        };
      });
    }

    // Group services by layer
    Object.entries(data.services).forEach(([id, service]) => {
      const layerNumber = service.layer || 1;

      // Use layer definition if available, otherwise create default
      if (!layers[layerNumber]) {
        if (layerDefinitions[layerNumber]) {
          layers[layerNumber] = { ...layerDefinitions[layerNumber] };
        } else {
          layers[layerNumber] = {
            number: layerNumber,
            name: `Layer ${layerNumber}`,
            services: [],
            color: getLayerColor(layerNumber)
          };
        }
      }

      layers[layerNumber].services.push({ ...service, id });
      services.push({ ...service, id });
    });

    // Extract connections from service data
    Object.entries(data.services).forEach(([id, service]) => {
      // Add outbound connections
      if (service.connections?.outbound) {
        service.connections.outbound.forEach(target => {
          connections.push({
            from: id,
            to: target.target || target,
            type: target.type || 'default'
          });
        });
      }
    });

    return {
      layers: Object.values(layers).sort((a, b) => a.number - b.number),
      services,
      connections
    };
  };

  // Get layer color based on layer number
  const getLayerColor = (layerNumber) => {
    const colors = {
      1: '#3b82f6',
      2: '#a855f7',
      3: '#ec4899',
      4: '#f59e0b',
      5: '#10b981'
    };
    return colors[layerNumber] || '#6b7280';
  };

  // Get service type color
  const getServiceColor = (type) => {
    const colors = {
      lambda: '#ff9900',
      dynamodb: '#4b61d1',
      s3: '#569a31',
      apigateway: '#ff4f00',
      secretsmanager: '#dd344c',
      cloudwatch: '#759eeb',
      iam: '#dd3444',
      sns: '#ff9900',
      sqs: '#ff9900',
      stepfunctions: '#e7157b'
    };
    return colors[type] || '#6b7280';
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!isDataLoaded || !architectureData || !svgRef.current) return;

    console.log('Initializing D3 visualization with data:', architectureData);

    const { layers, services, connections } = processArchitectureData(architectureData);

    // SVG dimensions
    const width = 4000;
    const height = 3000;

    // Layer column layout (horizontal)
    const layerSpacing = 700; // Horizontal spacing between layer columns
    const layerWidth = 500;   // Width of each layer column
    const layerHeight = 2000; // Height of each layer column
    const nodeWidth = 320;
    const nodeHeight = 80;
    const nodeSpacing = 120;  // Vertical spacing between nodes
    const layerPadding = 50;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const mainGroup = svg.append('g')
      .attr('id', 'diagram-root')
      .attr('transform', 'translate(0, 0) scale(1)');

    // Add arrow marker definition
    mainGroup.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 9)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#9c9c9c');

    // Add layer backgrounds
    const layerBackgrounds = mainGroup.append('g').attr('id', 'layer-backgrounds');
    layers.forEach((layer, index) => {
      const serviceCount = layer.services.length;
      const adaptiveHeight = Math.max(400, serviceCount * 120 + 200);

      // Layer background rectangle
      layerBackgrounds.append('rect')
        .attr('x', index * layerSpacing + 100)
        .attr('y', 50)
        .attr('width', layerWidth)
        .attr('height', adaptiveHeight)
        .attr('fill', layer.color + '10')
        .attr('stroke', layer.color + '80')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('rx', 12);

      // Layer title - centered over the full layer background
      layerBackgrounds.append('text')
        .attr('x', index * layerSpacing + 100 + layerWidth / 2)
        .attr('y', 35)
        .attr('fill', layer.color)
        .attr('font-size', '16px')
        .attr('font-weight', '600')
        .attr('text-anchor', 'middle')
        .text(`${layer.name} (${serviceCount} service${serviceCount !== 1 ? 's' : ''})`);
    });

    // Add connections group
    const connectionsGroup = mainGroup.append('g').attr('id', 'connections');

    // Create a map of service nodes by ID for connection drawing
    const nodePositions = new Map();

    // Add services group
    const servicesGroup = mainGroup.append('g').attr('id', 'services');

    // Position services in their layer columns (vertically stacked)
    layers.forEach((layer, layerIndex) => {
      const servicesInLayer = layer.services;
      const x = layerIndex * layerSpacing + 100 + layerPadding; // X position for this layer column

      servicesInLayer.forEach((service, serviceIndex) => {
        const y = 150 + serviceIndex * nodeSpacing; // Y position (stacked vertically)

        // Store node position for connection drawing
        nodePositions.set(service.id, { x: x + nodeWidth / 2, y: y + nodeHeight / 2 });

        // Create service node
        const nodeGroup = servicesGroup.append('g')
          .attr('class', 'service-node')
          .attr('data-service-id', service.id)
          .attr('transform', `translate(${x}, ${y})`)
          .style('cursor', 'pointer')
          .on('click', () => {
            setSelectedService(service);
            setDetailsOpen(true);
          });

        // Get AWS service icon information
        const awsServiceInfo = getAWSServiceIcon(service.type);

        // Node background
        nodeGroup.append('rect')
          .attr('class', 'node-background')
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('rx', 8)
          .attr('fill', '#1a1a1a')
          .attr('stroke', getServiceColor(service.type))
          .attr('stroke-width', 2);

        // Icon background - subtle rounded rectangle
        nodeGroup.append('rect')
          .attr('x', 12)
          .attr('y', 12)
          .attr('width', 40)
          .attr('height', 40)
          .attr('rx', 6)
          .attr('fill', '#ffffff')
          .attr('fill-opacity', 0.08)
          .attr('stroke', getServiceColor(service.type))
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.2);

        // AWS Service Icon
        nodeGroup.append('image')
          .attr('x', 16)
          .attr('y', 16)
          .attr('width', 32)
          .attr('height', 32)
          .attr('href', awsServiceInfo.iconUrl)
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .style('opacity', 0.9);

        // Service name
        nodeGroup.append('text')
          .attr('x', 64)
          .attr('y', 28)
          .attr('text-anchor', 'start')
          .attr('fill', '#ffffff')
          .attr('font-size', '14px')
          .attr('font-weight', '600')
          .text(service.name || service.id)
          .call(wrapText, nodeWidth - 80);

        // Service type
        nodeGroup.append('text')
          .attr('x', 64)
          .attr('y', 46)
          .attr('text-anchor', 'start')
          .attr('fill', '#9c9c9c')
          .attr('font-size', '12px')
          .text(service.type?.toUpperCase() || 'CUSTOM');

        // Layer indicator circle
        nodeGroup.append('circle')
          .attr('cx', nodeWidth - 20)
          .attr('cy', 20)
          .attr('r', 8)
          .attr('fill', layer.color);

        // Layer number
        nodeGroup.append('text')
          .attr('x', nodeWidth - 20)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('fill', '#030303')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .text(layerIndex + 1);
      });
    });

    // Draw connections between services (only if showConnections is true)
    if (showConnections) {
      connections.forEach(conn => {
        const fromPos = nodePositions.get(conn.from);
        const toPos = nodePositions.get(conn.to);

        if (fromPos && toPos) {
          // Calculate control points for curved connection
          const midX = (fromPos.x + toPos.x) / 2;

          // Create curved path
          connectionsGroup.append('path')
            .attr('class', 'connection-line')
            .attr('d', `M ${fromPos.x} ${fromPos.y} C ${midX} ${fromPos.y}, ${midX} ${toPos.y}, ${toPos.x} ${toPos.y}`)
            .attr('stroke', '#9c9c9c')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none')
            .attr('opacity', 0.5)
            .attr('marker-end', 'url(#arrowhead)');
        }
      });
    }

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Fit to view
    const bbox = mainGroup.node().getBBox();
    const scale = Math.min(
      (svg.node().clientWidth * 0.9) / bbox.width,
      (svg.node().clientHeight * 0.9) / bbox.height,
      1
    );
    const transform = d3.zoomIdentity
      .translate(
        (svg.node().clientWidth - bbox.width * scale) / 2 - bbox.x * scale,
        (svg.node().clientHeight - bbox.height * scale) / 2 - bbox.y * scale
      )
      .scale(scale);

    svg.call(zoom.transform, transform);

  }, [isDataLoaded, architectureData, showConnections]);

  // Text wrapping helper
  const wrapText = (text, width) => {
    text.each(function() {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word;
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.1;
      const y = text.attr('y');
      const dy = 0;
      let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
        }
      }
    });
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Toggle layer expansion
  const toggleLayer = (layerId) => {
    const newExpanded = new Set(expandedLayers);
    const isExpanding = !newExpanded.has(layerId);

    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);

    // Scroll the expanded layer into view
    if (isExpanding) {
      setTimeout(() => {
        const layerElement = document.querySelector(`[data-layer-id="${layerId}"]`);
        if (layerElement) {
          layerElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  // Toggle filter
  const toggleFilter = (filterType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType);
    } else {
      newFilters.add(filterType);
    }
    setActiveFilters(newFilters);
  };

  // Select service from sidebar
  const selectService = (service) => {
    setSelectedService(service);
    setDetailsOpen(true);
    setActiveTab('overview');
  };

  // Close details panel
  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedService(null);
  };

  // Get CloudFormation for selected service
  const getServiceCloudFormation = (service) => {
    if (!cloudformationData || !service) return null;

    // Try to find CloudFormation by logical ID
    const resources = cloudformationData.Resources || {};
    const logicalId = service.id.split('/').pop();

    return resources[logicalId] || null;
  };

  // Calculate statistics
  const calculateStatistics = () => {
    if (!architectureData || !architectureData.services) {
      return { totalResources: 0, totalConnections: 0, totalLayers: 0 };
    }

    const totalResources = Object.keys(architectureData.services).length;
    let totalConnections = 0;

    Object.values(architectureData.services).forEach((service) => {
      if (service.connections) {
        totalConnections += service.connections.inbound?.length || 0;
        totalConnections += service.connections.outbound?.length || 0;
      }
    });

    const totalLayers = architectureData.layers?.length || 0;

    return { totalResources, totalConnections, totalLayers };
  };

  if (!isDataLoaded) {
    return (
      <div className="page-container">
        <div className="welcome-message">
          <h2>Welcome to Interactive Diagram</h2>
          <p>Please import the architecture files to visualize the interactive architecture diagram.</p>
          <div className="import-hint">
            Click the "Import Files" button in the header to get started.
          </div>
        </div>
      </div>
    );
  }

  const { layers, services } = processArchitectureData(architectureData);
  const { totalResources, totalConnections, totalLayers } = calculateStatistics();

  return (
    <div className="page-container">
      {/* Statistics Header */}
      <div className="diagram-stats-header">
        <div className="stats-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary-accent)">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
          </svg>
          <span className="stats-text">
            <strong className="stats-value primary">{totalResources}</strong> Resources
          </span>
        </div>
        <div className="stats-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary-accent)" strokeWidth="2">
            <path d="M6 3v12" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="15" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          </svg>
          <span className="stats-text">
            <strong className="stats-value secondary">{totalConnections}</strong> Connections
          </span>
        </div>
        <div className="stats-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tertiary-accent)" strokeWidth="2">
            <polygon points="12,2 2,7 12,12 22,7 12,2" />
            <polyline points="2,17 12,22 22,17" />
          </svg>
          <span className="stats-text">
            <strong className="stats-value tertiary">{totalLayers}</strong> Layers
          </span>
        </div>
      </div>

      <div className="diagram-wrapper">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            {/* Search */}
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="search-box"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="filter-header">
              <span className="filter-label">Filter by Type</span>
            </div>
            <div className="filter-tabs">
              <div className={`filter-tab ${activeFilters.size === 0 ? 'active' : ''}`} onClick={() => setActiveFilters(new Set())}>
                All <span className="filter-badge">{services.length}</span>
              </div>
              {(() => {
                // Extract all unique service types from services
                const typeCounts = {};
                services.forEach(service => {
                  const type = service.type || 'other';
                  typeCounts[type] = (typeCounts[type] || 0) + 1;
                });

                // Convert to array and sort by count (descending)
                const sortedTypes = Object.entries(typeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => ({ type, count }));

                return sortedTypes.map(({ type, count }) => (
                  <div
                    key={type}
                    className={`filter-tab ${activeFilters.has(type) ? 'active' : ''}`}
                    onClick={() => toggleFilter(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)} <span className="filter-badge">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content">
            <div className="layer-section">
              <h3 className="section-title">Architecture Layers</h3>
              {layers.map(layer => {
                const isExpanded = expandedLayers.has(layer.number);
                const filteredServices = layer.services.filter(service => {
                  // Apply search filter
                  const matchesSearch = !searchQuery ||
                    service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    service.id?.toLowerCase().includes(searchQuery.toLowerCase());

                  // Apply type filter
                  const matchesFilter = activeFilters.size === 0 || activeFilters.has(service.type);

                  return matchesSearch && matchesFilter;
                });

                return (
                  <div key={layer.number} className="layer-item" data-layer-id={layer.number}>
                    <button className="layer-header" onClick={() => toggleLayer(layer.number)}>
                      <div className="layer-main">
                        <svg
                          className={`layer-expand-icon ${isExpanded ? 'expanded' : ''}`}
                          width="18"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="9,18 15,12 9,6" fill="none" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <div className="layer-color-dot" style={{ backgroundColor: layer.color }}></div>
                        <span className="layer-name">{layer.name}</span>
                      </div>
                      <span className="layer-count">{filteredServices.length}</span>
                    </button>

                    <div className={`service-list ${isExpanded ? 'expanded' : ''}`}>
                      {filteredServices.map(service => {
                        const awsServiceInfo = getAWSServiceIcon(service.type);

                        return (
                          <button
                            key={service.id}
                            className={`service-item ${selectedService?.id === service.id ? 'selected' : ''}`}
                            onClick={() => selectService(service)}
                          >
                            <div className="service-icon" style={{
                              borderColor: `${awsServiceInfo.color}33`
                            }}>
                              <img
                                src={awsServiceInfo.iconUrl}
                                alt={service.type}
                                onError={(e) => {
                                  // Fallback to a default icon if service icon fails to load
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="service-text">
                              <span className="service-name">{service.name || service.id}</span>
                              <span className="service-description">
                                {service.metadata?.purpose || service.description || service.type}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredServices.length === 0 && (
                        <div className="no-services">No matching services</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Diagram */}
        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="diagram-container">
            <svg
              ref={svgRef}
              className="diagram-svg"
              viewBox="0 0 4000 3000"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9c9c9c" />
                </marker>
              </defs>
            </svg>

            {/* Controls */}
            <div className="diagram-controls">
              <button className="control-btn icon-btn" onClick={toggleSidebar} title="Toggle Sidebar">
                ☰
              </button>
              <button
                className="control-btn-labeled"
                onClick={() => {
                  // Fit to view
                  if (!svgRef.current) return;
                  const svg = d3.select(svgRef.current);
                  const mainGroup = svg.select('#diagram-root');
                  const bbox = mainGroup.node().getBBox();
                  const scale = Math.min(
                    (svg.node().clientWidth * 0.9) / bbox.width,
                    (svg.node().clientHeight * 0.9) / bbox.height,
                    1
                  );
                  const zoom = d3.zoom();
                  const transform = d3.zoomIdentity
                    .translate(
                      (svg.node().clientWidth - bbox.width * scale) / 2 - bbox.x * scale,
                      (svg.node().clientHeight - bbox.height * scale) / 2 - bbox.y * scale
                    )
                    .scale(scale);
                  svg.transition().duration(750).call(zoom.transform, transform);
                }}
                title="Fit to View"
              >
                Fit to View
              </button>
              <button
                className="control-btn-labeled"
                onClick={() => {
                  // Reset zoom
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom();
                  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
                }}
                title="Reset Zoom"
              >
                Reset Zoom
              </button>
              <button
                className={`control-btn-toggle ${showConnections ? 'active' : ''}`}
                onClick={() => setShowConnections(!showConnections)}
                title="Toggle Connections"
              >
                <span className="toggle-label">Connections:</span>
                <span className={`toggle-state ${showConnections ? 'on' : 'off'}`}>
                  {showConnections ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </main>

        {/* Details Panel */}
        <aside className={`details-panel ${detailsOpen ? 'open' : ''}`}>
          {selectedService && (
            <>
              <div className="details-header">
                <div className="service-header-content">
                  <div className="service-icon-large" style={{
                    borderColor: `${getAWSServiceIcon(selectedService.type).color}33`
                  }}>
                    <img
                      src={getAWSServiceIcon(selectedService.type).iconUrl}
                      alt={selectedService.type}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                  <div className="service-header-info">
                    <h2 className="details-title">{selectedService.name || selectedService.id}</h2>
                    {(selectedService.metadata?.purpose || selectedService.metadata?.description) && (
                      <p className="service-purpose">
                        {selectedService.metadata.purpose || selectedService.metadata.description}
                      </p>
                    )}
                    <div className="service-badges">
                      <span className="service-type-badge-header" style={{
                        backgroundColor: getAWSServiceIcon(selectedService.type).color
                      }}>
                        {selectedService.type}
                      </span>
                      <div className="layer-badge-header">
                        <div className="layer-dot" style={{ backgroundColor: getLayerColor(selectedService.layer) }}></div>
                        <span>Layer {selectedService.layer || 1}</span>
                      </div>
                      {selectedService.category && (
                        <span className="category-badge">{selectedService.category}</span>
                      )}
                      {selectedService.processOrder && (
                        <span className="process-badge">Step {selectedService.processOrder}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="close-btn" onClick={closeDetails}>×</button>
              </div>

              {/* Tabs */}
              <div className="detail-tabs">
                {(() => {
                  // Calculate which tabs to show (matching HTML logic)
                  const totalConnections = (selectedService.connections?.inbound?.length || 0) +
                                          (selectedService.connections?.outbound?.length || 0);
                  const serviceReqs = selectedService.requirements || [];

                  const tabsToShow = [
                    { id: 'overview', label: 'Overview', show: true },
                    { id: 'connections', label: `Connections (${totalConnections})`, show: totalConnections > 0 },
                    { id: 'requirements', label: `Requirements (${serviceReqs.length})`, show: serviceReqs.length > 0 },
                    { id: 'config', label: 'Configuration', show: ['lambda', 'dynamodb', 's3'].includes(selectedService.type) },
                    { id: 'code', label: 'Code', show: selectedService.type === 'lambda' }
                  ].filter(tab => tab.show);

                  return tabsToShow.map(tab => (
                    <button
                      key={tab.id}
                      className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ));
                })()}
              </div>

              <div className="details-content">
                {activeTab === 'overview' && <OverviewTab service={selectedService} />}
                {activeTab === 'connections' && <ConnectionsTab service={selectedService} architectureData={architectureData} />}
                {activeTab === 'requirements' && <RequirementsTab service={selectedService} architectureData={architectureData} />}
                {activeTab === 'config' && <ConfigurationTab service={selectedService} />}
                {activeTab === 'code' && <CodeTab service={selectedService} />}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Diagram;
