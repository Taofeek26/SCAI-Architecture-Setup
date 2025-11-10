// AWS Service Icons - Using icon.icepanel.io CDN for real AWS icons

export const AWS_SERVICE_MAPPING = {
  // Compute Services
  lambda: {
    name: "Lambda",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg",
    color: "#FF9900",
  },

  // Database Services
  dynamodb: {
    name: "DynamoDB",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg",
    color: "#4053D6",
  },

  // Storage Services
  s3: {
    name: "S3",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Storage/Simple-Storage-Service.svg",
    color: "#569A31",
  },

  // API Services
  apigateway: {
    name: "API Gateway",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg",
    color: "#D9027B",
  },
  "apigateway-rest": {
    name: "API Gateway (REST/HTTP)",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg",
    color: "#D9027B",
  },
  "apigateway-websocket": {
    name: "API Gateway (WebSocket)",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg",
    color: "#D9027B",
  },

  // Monitoring & Management
  cloudwatch: {
    name: "CloudWatch",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg",
    color: "#FF4F8B",
  },
  cloudwatchalarm: {
    name: "CloudWatch",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg",
    color: "#FF4F8B",
  },
  cloudwatchloggroup: {
    name: "CloudWatch Logs",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg",
    color: "#FF4F8B",
  },

  // Security Services
  iam: {
    name: "IAM",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Identity-and-Access-Management.svg",
    color: "#DD344C",
  },
  secretsmanager: {
    name: "Secrets Manager",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Secrets-Manager.svg",
    color: "#DD344C",
  },

  // Messaging & Integration
  sns: {
    name: "SNS",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Notification-Service.svg",
    color: "#FF4F8B",
  },
  sqs: {
    name: "SQS",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/Simple-Queue-Service.svg",
    color: "#FF4F8B",
  },

  // Workflow Services
  stepfunctions: {
    name: "Step Functions",
    iconUrl: "https://icon.icepanel.io/AWS/svg/App-Integration/Step-Functions.svg",
    color: "#E7157B",
  },

  // Content Delivery
  cloudfront: {
    name: "CloudFront",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/CloudFront.svg",
    color: "#759EEB",
  },

  // DNS
  route53: {
    name: "Route 53",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Route-53.svg",
    color: "#9D5227",
  },

  // Analytics
  kinesis: {
    name: "Kinesis",
    iconUrl: "https://icon.icepanel.io/AWS/svg/Analytics/Kinesis.svg",
    color: "#FF9900",
  },

  // Default/Fallback
  default: {
    name: "AWS Service",
    iconUrl: "https://icon.icepanel.io/AWS/svg/General/General.svg",
    color: "#FF9900",
  },
};

/**
 * Get AWS service icon information by service type
 * @param {string} type - Service type (e.g., 'lambda', 'dynamodb')
 * @returns {Object} Service info with name, iconUrl, and color
 */
export function getAWSServiceIcon(type) {
  if (!type) return AWS_SERVICE_MAPPING.default;

  // Normalize the type to lowercase for consistent matching
  const normalizedType = type.toLowerCase().replace(/[-_\s]/g, "");

  // Look up the service in our AWS service mapping
  return AWS_SERVICE_MAPPING[normalizedType] ||
         AWS_SERVICE_MAPPING[type] ||
         AWS_SERVICE_MAPPING.default;
}

/**
 * Get service icon URL by type
 * @param {string} type - Service type
 * @returns {string} Icon URL
 */
export function getServiceIconUrl(type) {
  return getAWSServiceIcon(type).iconUrl;
}

/**
 * Get service color by type
 * @param {string} type - Service type
 * @returns {string} Color hex code
 */
export function getServiceColor(type) {
  return getAWSServiceIcon(type).color;
}
