# AWS Setup Guide — OrbitOps Backend

> **Purpose:** Step-by-step instructions for configuring all AWS services required by the OrbitOps backend.  
> **Target Audience:** Backend developer teammate setting up from scratch.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [AWS Account & IAM Setup](#2-aws-account--iam-setup)
3. [Amazon Bedrock Mantle Access](#3-amazon-bedrock-mantle-access)
4. [AWS CloudWatch Logs Setup](#4-aws-cloudwatch-logs-setup)
5. [Alexa Developer Console Setup](#5-alexa-developer-console-setup)
6. [Tunnel Setup (ngrok / Cloudflare)](#6-tunnel-setup-ngrok--cloudflare)
7. [GitHub Personal Access Token](#7-github-personal-access-token)
8. [Heroku API Token (Optional)](#8-heroku-api-token-optional)
9. [Environment Variables Checklist](#9-environment-variables-checklist)
10. [Verification Steps](#10-verification-steps)

---

## 1. Prerequisites

Before starting, ensure you have:

- [ ] **AWS Account** with billing enabled
- [ ] **AWS CLI v2** installed: `aws --version`
- [ ] **Node.js ≥ 20 LTS** installed: `node --version`
- [ ] **npm ≥ 10** installed: `npm --version`
- [ ] **Git** installed: `git --version`
- [ ] **Amazon Developer Account** (for Alexa Skills)
- [ ] **GitHub Account** with repo creation permissions
- [ ] **Echo Dot** or Alexa Simulator access

---

## 2. AWS Account & IAM Setup

### 2.1 — Create an IAM User for OrbitOps

```bash
# Create the user
aws iam create-user --user-name orbitops-backend

# Create an access key
aws iam create-access-key --user-name orbitops-backend
```

Save the `AccessKeyId` and `SecretAccessKey` — you'll need them for `.env`.

### 2.2 — Create IAM Policy

Create a file `orbitops-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockMantleAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsRead",
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:GetLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:*"
    }
  ]
}
```

```bash
# Create the policy
aws iam create-policy \
  --policy-name OrbitOpsBackendPolicy \
  --policy-document file://orbitops-policy.json

# Attach to user (replace ACCOUNT_ID)
aws iam attach-user-policy \
  --user-name orbitops-backend \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/OrbitOpsBackendPolicy
```

### 2.3 — Configure AWS CLI Profile

```bash
aws configure --profile orbitops
# Enter: AccessKeyId, SecretAccessKey, Region (us-east-1), Output (json)
```

---

## 3. Amazon Bedrock Mantle Access

### 3.1 — Enable Bedrock Mantle in Your Region

1. Go to **AWS Console** → **Amazon Bedrock** → **Model access**
2. Request access to `openai.gpt-oss-120b` (or the model available in your region)
3. Wait for approval (usually instant for standard models)

### 3.2 — Get Bedrock Mantle API Key

The Bedrock Mantle endpoint uses an API key for authentication:

1. Go to **AWS Console** → **Amazon Bedrock** → **Mantle**
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Copy the key — this is your `BEDROCK_MANTLE_API_KEY`

### 3.3 — Verify Endpoint Access

```bash
curl -s https://bedrock-mantle.us-east-1.api.aws/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY" | head -20
```

You should see a list of available models including `openai.gpt-oss-120b`.

### 3.4 — Test with Node.js

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://bedrock-mantle.us-east-1.api.aws/v1',
});

const response = await client.chat.completions.create({
  model: 'openai.gpt-oss-120b',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

---

## 4. AWS CloudWatch Logs Setup

The `check_cloud_deployments` tool queries CloudWatch Logs for error monitoring.

### 4.1 — Identify Your Log Groups

```bash
aws logs describe-log-groups --profile orbitops --region us-east-1
```

Note the log group names for any ECS/Lambda/EC2 services you want to monitor.

### 4.2 — Test Log Query

```bash
aws logs filter-log-events \
  --profile orbitops \
  --region us-east-1 \
  --log-group-name "/ecs/your-service" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '10 minutes ago' +%s000) \
  --limit 5
```

### 4.3 — No Log Groups? Create a Test One

If you don't have existing CloudWatch log groups for testing:

```bash
# Create a test log group
aws logs create-log-group \
  --log-group-name "/devpulse/test" \
  --profile orbitops

# Create a log stream
aws logs create-log-stream \
  --log-group-name "/devpulse/test" \
  --log-stream-name "test-stream" \
  --profile orbitops

# Put a test error event
aws logs put-log-events \
  --log-group-name "/devpulse/test" \
  --log-stream-name "test-stream" \
  --log-events "timestamp=$(date +%s000),message=ERROR: Test error from DevPulse setup" \
  --profile orbitops
```

---

## 5. Alexa Developer Console Setup

### 5.1 — Create an Alexa Skill

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click **Create Skill**
3. Settings:
   - **Skill name:** DevPulse
   - **Primary locale:** English (US)
   - **Type:** Custom
   - **Hosting:** Provision your own
4. Click **Create Skill**

### 5.2 — Configure the Interaction Model

Go to **Build** → **Interaction Model** → **JSON Editor** and paste:

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "dev pulse",
      "intents": [
        {
          "name": "DevPulseIntent",
          "slots": [
            {
              "name": "query",
              "type": "AMAZON.SearchQuery"
            }
          ],
          "samples": [
            "{query}",
            "help me with {query}",
            "run {query}",
            "scaffold {query}",
            "debug {query}",
            "check {query}",
            "push {query}",
            "inspect {query}",
            "create {query}",
            "fix {query}"
          ]
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        },
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.FallbackIntent",
          "samples": []
        }
      ]
    }
  }
}
```

Click **Save Model** → **Build Model**.

### 5.3 — Configure the Endpoint

1. Go to **Build** → **Endpoint**
2. Select **HTTPS**
3. Default Region: `https://YOUR_TUNNEL_URL/api/alexa`
4. SSL Certificate: "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"
5. Click **Save Endpoints**

### 5.4 — Test in Simulator

1. Go to **Test** tab
2. Enable testing in "Development" mode
3. Type: "open dev pulse"
4. Verify you get a welcome response

---

## 6. Tunnel Setup (ngrok / Cloudflare)

Alexa requires an HTTPS endpoint. Since the backend runs locally on `http://localhost:8000`, you need a tunnel.

### Option A: ngrok (Fastest)

```bash
# Install
npm install -g ngrok

# Start tunnel
ngrok http 8000
```

Copy the `https://xxxx.ngrok-free.app` URL and paste it in the Alexa Developer Console endpoint as: `https://xxxx.ngrok-free.app/api/alexa`

> **Note:** Free ngrok URLs change on every restart. Update the Alexa endpoint URL each time.

### Option B: Cloudflare Tunnel (Persistent)

```bash
# Install cloudflared
# macOS: brew install cloudflared
# Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Quick tunnel (no Cloudflare account needed)
cloudflared tunnel --url http://localhost:8000
```

### Option C: localtunnel

```bash
npx localtunnel --port 8000
```

---

## 7. GitHub Personal Access Token

The `provision_github_repo` tool needs a GitHub token to create repositories.

### 7.1 — Generate Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. Settings:
   - **Token name:** orbitops-backend
   - **Expiration:** 90 days (or as needed)
   - **Repository access:** All repositories (or specific ones)
   - **Permissions:**
     - **Repository permissions:**
       - Administration: Read and write
       - Contents: Read and write
       - Metadata: Read-only
       - Workflows: Read and write
       - Issues: Read and write
       - Pull requests: Read and write
3. Click **Generate token**
4. Copy the `github_pat_...` token — this is your `GITHUB_TOKEN`

### 7.2 — Verify

```bash
curl -s https://api.github.com/user \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .login
```

---

## 8. Heroku API Token (Optional)

Only needed if you want `check_cloud_deployments` to monitor Heroku apps.

```bash
# Login to Heroku CLI
heroku login

# Get API token
heroku auth:token
```

Or go to [Heroku Account Settings](https://dashboard.heroku.com/account) → **API Key** → Reveal.

---

## 9. Environment Variables Checklist

Create `.env` in the backend root:

```env
# === REQUIRED ===

# Amazon Bedrock Mantle
BEDROCK_MANTLE_API_KEY=bm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1

# GitHub
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Local Workspace Path
WORKSPACE_DIR=~/projects

# Server
PORT=8000
NODE_ENV=development

# === OPTIONAL ===

# AWS Credentials (if not using default chain / aws configure)
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Heroku (for check_cloud_deployments tool)
HEROKU_API_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Verification

```bash
# Quick check that .env is loaded
node -e "require('dotenv').config(); console.log('Region:', process.env.AWS_REGION)"
```

---

## 10. Verification Steps

Run through this checklist after setup to confirm everything works:

### ✅ AWS Bedrock Mantle
```bash
curl -s https://bedrock-mantle.us-east-1.api.aws/v1/models \
  -H "Authorization: Bearer $BEDROCK_MANTLE_API_KEY" | head -5
# Expected: JSON list of models
```

### ✅ AWS CloudWatch
```bash
aws logs describe-log-groups --profile orbitops --region us-east-1 | head -10
# Expected: JSON with logGroups array
```

### ✅ GitHub Token
```bash
curl -s https://api.github.com/user \
  -H "Authorization: Bearer $GITHUB_TOKEN" | jq .login
# Expected: Your GitHub username
```

### ✅ GitHub Repo Write Access
```bash
curl -s https://api.github.com/user/repos \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -d '{"name":"orbitops-test-delete-me","private":true}' | jq .html_url
# Expected: URL of created repo
# Clean up: delete the test repo
```

### ✅ Tunnel
```bash
# In terminal 1: npm run dev (start backend on port 8000)
# In terminal 2: ngrok http 8000
# Test: curl https://YOUR_TUNNEL_URL/health
# Expected: {"status":"ok",...}
```

### ✅ Alexa Skill
1. Open [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Go to your skill → Test tab
3. Type: "open dev pulse"
4. Expected: Welcome message response

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `BEDROCK_MANTLE_API_KEY` invalid | Regenerate in AWS Console → Bedrock → Mantle → API Keys |
| `403` on CloudWatch | Check IAM policy has `logs:FilterLogEvents` permission |
| `401` on GitHub API | Regenerate token with correct permissions (admin + contents) |
| ngrok URL changed | Update Alexa Developer Console endpoint URL |
| `ask-sdk-express-adapter` import error | Use `import { ExpressAdapter } from 'ask-sdk-express-adapter/dist/index.js'` (ESM quirk) |
| Alexa 8s timeout | Verify `Promise.race()` uses 6500ms, not 8000ms |
| CORS errors from frontend | Ensure Express CORS middleware allows `http://localhost:8080` |
