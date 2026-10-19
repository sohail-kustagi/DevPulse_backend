import { Router, type Request, type Response } from 'express';
import {
  SkillBuilders,
  type HandlerInput,
  type RequestHandler,
  type ErrorHandler,
  getRequestType,
  getIntentName,
  getSlotValue,
} from 'ask-sdk-core';
import { sanitizeSSML } from './ssml.js';
import { runAgentTurn } from '../agent/orchestrator.js';
import { hudBus } from '../hud/eventBus.js';

export const alexaRouter = Router();

const TIMEOUT_MS = 6500; // 6.5s guard to beat Alexa's 8.0s hard cutoff

// 1. Launch Request
export const LaunchRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = sanitizeSSML(
      'DevPulse ambient engineering copilot is active. What service would you like to design, inspect, or scaffold?'
    );
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

// 2. DevPulse Intent (Voice Command Handler with 6.5s Promise.race Timeout Guard)
export const DevPulseIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    if (getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') {
      return false;
    }
    const intentName = getIntentName(handlerInput.requestEnvelope);
    return (
      intentName === 'DevPulseIntent' ||
      intentName === 'DevPulseActionIntent' ||
      intentName === 'DeveloperQueryIntent' ||
      intentName === 'ScaffoldServiceIntent' ||
      intentName === 'InspectCodeIntent'
    );
  },
  async handle(handlerInput: HandlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let query = '';

    if ('intent' in request && request.intent.slots) {
      query =
        getSlotValue(handlerInput.requestEnvelope, 'query') ||
        getSlotValue(handlerInput.requestEnvelope, 'Action') ||
        getSlotValue(handlerInput.requestEnvelope, 'Service') ||
        getSlotValue(handlerInput.requestEnvelope, 'catchall') ||
        '';
    }

    if (!query) {
      query = 'Borrow the auth module from voice-gateway and scaffold stripe-relay';
    }

    // 1. Emit live voice transcript to HUD
    hudBus.emitVoiceInput(query);

    // 2. Wrap heavy agent turn in 6.5s Promise.race against Alexa cutoff
    const agentPromise = runAgentTurn(query, {});

    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) =>
      setTimeout(() => resolve({ isTimeout: true }), TIMEOUT_MS)
    );

    const raceResult = await Promise.race([agentPromise, timeoutPromise]);

    const reprompt = sanitizeSSML('What would you like me to inspect or execute next?');

    if ('isTimeout' in raceResult && raceResult.isTimeout) {
      // 6.5s exceeded: Respond immediately to Alexa so connection is not dropped,
      // while background agentPromise continues running and updating the HUD!
      const timeoutSpeech = sanitizeSSML(
        "I'm executing that multi-step workflow in the background now. You can watch the live architecture diagrams, diffs, and test results stream on your DevPulse HUD."
      );
      return handlerInput.responseBuilder
        .speak(timeoutSpeech)
        .reprompt(reprompt)
        .getResponse();
    }

    // Agent completed within 6.5s
    const completedResult = raceResult as any;
    const spoken = sanitizeSSML(completedResult.spokenSummary);
    return handlerInput.responseBuilder
      .speak(spoken)
      .reprompt(reprompt)
      .getResponse();
  },
};

// 3. Built-in Help Intent
export const HelpIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = sanitizeSSML(
      'You can tell me to borrow auth from voice-gateway and scaffold a new service, triage failing tests, check CloudWatch error rates, or push your code to GitHub.'
    );
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

// 4. Cancel & Stop
export const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return (
      getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput: HandlerInput) {
    const speakOutput = sanitizeSSML('DevPulse standing by.');
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

// 5. Session Ended
export const SessionEndedRequestHandler: RequestHandler = {
  canHandle(handlerInput: HandlerInput) {
    return getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput: HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

// 6. Error Handler
export const CustomErrorHandler: ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: HandlerInput, error: Error) {
    console.error(`[ASK SDK Error]: ${error.message}`);
    const speakOutput = sanitizeSSML(
      'Sorry, I encountered an issue processing that voice command. Please check your terminal or HUD.'
    );
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

// Create custom ASK Skill
export const alexaSkill = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    DevPulseIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(CustomErrorHandler)
  .create();

// POST /api/alexa route
alexaRouter.post('/api/alexa', async (req: Request, res: Response) => {
  try {
    const response = await alexaSkill.invoke(req.body);
    res.json(response);
  } catch (err: any) {
    console.error('[Alexa Webhook Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});
