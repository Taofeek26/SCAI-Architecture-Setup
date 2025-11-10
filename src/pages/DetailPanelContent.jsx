import React from 'react';
import { getAWSServiceIcon } from '../utils/awsServiceIcons';

// Helper function to get service icon URL
const getServiceIconUrl = (type) => {
  return getAWSServiceIcon(type).iconUrl;
};

// Helper function to get service color
const getServiceColor = (type) => {
  return getAWSServiceIcon(type).color;
};

// Helper function to validate naming convention
const validateNamingConvention = (service) => {
  if (!service?.id || !service?.type) {
    return { valid: false, reason: 'Missing ID or type', expectedPattern: '', example: '' };
  }

  const serviceType = service.type.toLowerCase();
  const serviceId = service.id;

  switch (serviceType) {
    case 's3':
      const s3Pattern = /^scai-(prod|dev|test)-[a-z0-9-]+-(\{AccountId\}|\{accountid\}|[0-9]+)$/i;
      return {
        valid: s3Pattern.test(serviceId),
        expectedPattern: 'scai-{env}-{purpose}-{AccountId}',
        example: 'scai-prod-templates-{AccountId}',
        reason: s3Pattern.test(serviceId) ? 'Compliant' : 'Must be lowercase with format: scai-{env}-{purpose}-{AccountId}'
      };

    case 'cloudwatchloggroup':
      const logPattern = /^\/aws\/(lambda|apigateway|stepfunctions)\/SCAI-/;
      return {
        valid: logPattern.test(serviceId),
        expectedPattern: '/aws/{service}/SCAI-{Env}-{Layer}-{Name}',
        example: '/aws/lambda/SCAI-Prod-Core-DataKeyLifecycle',
        reason: logPattern.test(serviceId) ? 'Compliant' : 'Must follow AWS service log group pattern'
      };

    default:
      const standardPattern = /^SCAI-(Prod|Dev|Test)-(Core|Orchestration|Comm|Deploy|Security|Data|Events|Monitor|Alerts|Secrets)-/;
      return {
        valid: standardPattern.test(serviceId),
        expectedPattern: 'SCAI-{Env}-{Layer}-{ResourceName}',
        example: 'SCAI-Prod-Core-DataProcessor',
        reason: standardPattern.test(serviceId) ? 'Compliant' : 'Must follow SCAI naming convention'
      };
  }
};

// Overview Tab Content
export const OverviewTab = ({ service }) => {
  const namingValidation = validateNamingConvention(service);
  const serviceColor = getServiceColor(service?.type);

  return (
    <>
      {/* Description */}
      {(service?.metadata?.description || service?.metadata?.purpose) && (
        <div className="detail-section">
          <h3>Description</h3>
          <div className="detail-box">
            <p>{service.metadata.description || service.metadata.purpose}</p>
          </div>
        </div>
      )}

      {/* Capabilities */}
      {service?.metadata?.capabilities && service.metadata.capabilities.length > 0 && (
        <div className="detail-section">
          <h3>Capabilities</h3>
          <div className="detail-box">
            <p>{service.metadata.capabilities.join(' • ')}</p>
          </div>
        </div>
      )}

      {/* Integrations */}
      {service?.metadata?.integrations && service.metadata.integrations.length > 0 && (
        <div className="detail-section">
          <h3>Integrations</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {service.metadata.integrations.map((integration, idx) => (
              <span key={idx} className="integration-badge">
                {integration.name || integration}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resource Details */}
      <div className="detail-section">
        <h3>Resource Details</h3>
        <div className="detail-box">
          <div className="detail-item">
            <span className="detail-label">Type</span>
            <span className="service-type-badge" style={{ backgroundColor: serviceColor }}>
              {service?.type}
            </span>
          </div>

          {service?.layer !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Layer</span>
              <span className="detail-value">Layer {service.layer}</span>
            </div>
          )}

          {service?.category && (
            <div className="detail-item">
              <span className="detail-label">Category</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>{service.category}</span>
            </div>
          )}

          {service?.id && (
            <div className="detail-item">
              <span className="detail-label">Resource ID</span>
              <code className="resource-id-code">{service.id}</code>
            </div>
          )}

          {/* Additional metadata */}
          {service?.metadata && Object.entries(service.metadata)
            .filter(([key, value]) => !['type', 'purpose', 'description', 'capabilities', 'integrations'].includes(key))
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label" style={{ textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="detail-value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Naming Convention Compliance */}
      <div className={`naming-convention-box ${namingValidation.valid ? 'compliant' : 'non-compliant'}`}>
        <div className="naming-convention-header">
          <h3>SCAI Naming Convention</h3>
          <span className="compliance-badge">
            {namingValidation.valid ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </span>
        </div>
        <div className="naming-reason">{namingValidation.reason}</div>
        {!namingValidation.valid && (
          <div className="naming-expected">
            <div className="expected-label">Expected Pattern for {service?.type?.toUpperCase() || 'UNKNOWN'}:</div>
            <div className="expected-pattern">{namingValidation.expectedPattern}</div>
            <div className="expected-example">
              Example: <span className="example-code">{namingValidation.example}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Connections Tab Content
export const ConnectionsTab = ({ service, architectureData }) => {
  const inboundConnections = service?.connections?.inbound || [];
  const outboundConnections = service?.connections?.outbound || [];

  const renderConnection = (conn, isInbound) => {
    const targetId = isInbound ? conn.source : conn.target;
    const targetService = architectureData?.services?.[targetId];
    const serviceColor = targetService ? getServiceColor(targetService.type) : '#6b7280';
    const iconUrl = targetService ? getServiceIconUrl(targetService.type) : null;

    return (
      <div key={targetId} className="connection-item">
        <div className="connection-content">
          <div className="connection-icon-wrapper" style={{ borderColor: `${serviceColor}33` }}>
            {iconUrl ? (
              <img src={iconUrl} alt={targetService?.type} onError={(e) => e.target.style.display = 'none'} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={serviceColor} strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="12" y1="2" x2="12" y2="22"/>
              </svg>
            )}
          </div>
          <div className="connection-info">
            <p className="connection-name">{targetService?.name || targetId}</p>
            <p className="connection-details">
              {targetService ? `${targetService.type} • Layer ${targetService.layer}` : 'External System'}
            </p>
          </div>
        </div>
        {conn.label && <span className="connection-label">{conn.label}</span>}
      </div>
    );
  };

  return (
    <>
      {/* Inbound Connections */}
      <div className="detail-section">
        <div className="connection-header">
          <div className="connection-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12,5 5,12 12,19"></polyline>
            </svg>
            Inbound Connections
          </div>
          <span className="connection-count inbound">{inboundConnections.length}</span>
        </div>
        {inboundConnections.length > 0 ? (
          <div className="connections-list">
            {inboundConnections.map(conn => renderConnection(conn, true))}
          </div>
        ) : (
          <div className="no-connections">No inbound connections</div>
        )}
      </div>

      {/* Outbound Connections */}
      <div className="detail-section">
        <div className="connection-header">
          <div className="connection-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12,5 19,12 12,19"></polyline>
            </svg>
            Outbound Connections
          </div>
          <span className="connection-count outbound">{outboundConnections.length}</span>
        </div>
        {outboundConnections.length > 0 ? (
          <div className="connections-list">
            {outboundConnections.map(conn => renderConnection(conn, false))}
          </div>
        ) : (
          <div className="no-connections">No outbound connections</div>
        )}
      </div>
    </>
  );
};

// Requirements Tab Content
export const RequirementsTab = ({ service, architectureData }) => {
  const requirements = service?.requirements || [];

  return (
    <>
      <div className="detail-section">
        <h3>Business Requirements</h3>
        {requirements.length > 0 ? (
          <div className="requirements-list">
            {requirements.map((reqId, idx) => {
              const reqDetails = architectureData?.requirements?.[reqId];
              return (
                <div key={idx} className="requirement-item">
                  <div className="requirement-header">
                    <span className="requirement-id">{reqId}</span>
                    {reqDetails?.isEmbedded && <span className="embedded-badge">Embedded</span>}
                  </div>
                  {reqDetails && (
                    <div className="requirement-details">
                      <h4>{reqDetails.title}</h4>
                      <p>Layer {reqDetails.layer} • {reqDetails.resources?.length || 0} resources</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-connections">No requirements defined</div>
        )}
      </div>
    </>
  );
};

// Configuration Tab Content
export const ConfigurationTab = ({ service }) => {
  const serviceType = service?.type?.toLowerCase();

  const renderLambdaConfig = () => (
    <div className="config-grid">
      <div className="config-item">
        <div className="config-label">Runtime</div>
        <p className="config-value">Python 3.11</p>
      </div>
      <div className="config-item">
        <div className="config-label">Handler</div>
        <p className="config-value config-code">index.handler</p>
      </div>
      <div className="config-item">
        <div className="config-label">Memory</div>
        <p className="config-value">256 MB</p>
      </div>
      <div className="config-item">
        <div className="config-label">Timeout</div>
        <p className="config-value">30 seconds</p>
      </div>
    </div>
  );

  const renderDynamoDBConfig = () => (
    <div className="config-grid">
      <div className="config-item">
        <div className="config-label">Billing Mode</div>
        <p className="config-value">On-Demand</p>
      </div>
      <div className="config-item">
        <div className="config-label">Table Class</div>
        <p className="config-value">Standard</p>
      </div>
      <div className="config-item">
        <div className="config-label">Encryption</div>
        <p className="config-value">AWS Managed</p>
      </div>
      <div className="config-item">
        <div className="config-label">Point-in-time Recovery</div>
        <p className="config-value">Enabled</p>
      </div>
    </div>
  );

  const renderS3Config = () => (
    <div className="config-grid">
      <div className="config-item">
        <div className="config-label">Versioning</div>
        <p className="config-value">Enabled</p>
      </div>
      <div className="config-item">
        <div className="config-label">Encryption</div>
        <p className="config-value">AES-256</p>
      </div>
      <div className="config-item">
        <div className="config-label">Public Access</div>
        <p className="config-value">Blocked</p>
      </div>
      <div className="config-item">
        <div className="config-label">Transfer Acceleration</div>
        <p className="config-value">Disabled</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="detail-section">
        <h3>
          {serviceType === 'lambda' ? 'Lambda Configuration' :
           serviceType === 'dynamodb' ? 'DynamoDB Configuration' :
           'Configuration'}
        </h3>
        <div className="detail-box">
          {serviceType === 'lambda' && renderLambdaConfig()}
          {serviceType === 'dynamodb' && renderDynamoDBConfig()}
          {serviceType === 's3' && renderS3Config()}
          {!['lambda', 'dynamodb', 's3'].includes(serviceType) && (
            <p className="no-config">Configuration details not available for this resource type.</p>
          )}
        </div>
      </div>
    </>
  );
};

// Code Tab Content (Lambda only)
export const CodeTab = ({ service }) => {
  return (
    <>
      <div className="detail-section">
        <h3>Lambda Function Code</h3>
        <div className="code-block">
          <pre>{`import json

def handler(event, context):
    """
    ${service?.name || service?.id}
    ${service?.metadata?.description || service?.metadata?.purpose || ''}
    """

    # Process event
    print(f"Event: {json.dumps(event)}")

    # Implementation logic here

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Success',
            'service': '${service?.id}'
        })
    }`}</pre>
        </div>
      </div>
    </>
  );
};
