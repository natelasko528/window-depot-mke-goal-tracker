/**
 * Webhook Event Emitter
 * Emits events to webhook dispatcher for delivery to subscribed webhooks
 */

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Emit webhook event
 * @param {string} eventType - Event type (e.g., 'daily_log.created')
 * @param {object} payload - Event payload
 * @param {string|null} userId - Optional user ID to filter webhooks
 */
export async function emitWebhookEvent(eventType, payload, userId = null) {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, skipping webhook event');
    return;
  }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
    const dispatcherUrl = `${supabaseUrl}/functions/v1/webhook-dispatcher`;

    const response = await fetch(dispatcherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        user_id: userId,
        payload,
        source: 'app',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to emit webhook event:', await response.text());
    }
  } catch (error) {
    console.error('Error emitting webhook event:', error);
  }
}

/**
 * Event types
 */
export const WEBHOOK_EVENTS = {
  DAILY_LOG_CREATED: 'daily_log.created',
  DAILY_LOG_UPDATED: 'daily_log.updated',
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  GOAL_ACHIEVED: 'goal.achieved',
  FEED_POST_CREATED: 'feed_post.created',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
};

/**
 * Convenience functions for specific events
 */
export async function emitDailyLogCreated(dailyLog, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.DAILY_LOG_CREATED, {
    id: dailyLog.id,
    user_id: dailyLog.user_id,
    date: dailyLog.date,
    reviews: dailyLog.reviews,
    demos: dailyLog.demos,
    callbacks: dailyLog.callbacks,
  }, userId);
}

export async function emitDailyLogUpdated(dailyLog, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.DAILY_LOG_UPDATED, {
    id: dailyLog.id,
    user_id: dailyLog.user_id,
    date: dailyLog.date,
    reviews: dailyLog.reviews,
    demos: dailyLog.demos,
    callbacks: dailyLog.callbacks,
  }, userId);
}

export async function emitAppointmentCreated(appointment, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.APPOINTMENT_CREATED, {
    id: appointment.id,
    user_id: appointment.user_id,
    customer_name: appointment.customer_name,
    customer_phone: appointment.customer_phone,
    customer_email: appointment.customer_email,
    appointment_date: appointment.appointment_date,
    product_interests: appointment.product_interests,
  }, userId);
}

export async function emitAppointmentUpdated(appointment, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.APPOINTMENT_UPDATED, {
    id: appointment.id,
    user_id: appointment.user_id,
    customer_name: appointment.customer_name,
    appointment_date: appointment.appointment_date,
  }, userId);
}

export async function emitGoalAchieved(userId, goalType, date) {
  await emitWebhookEvent(WEBHOOK_EVENTS.GOAL_ACHIEVED, {
    user_id: userId,
    goal_type: goalType,
    date,
  }, userId);
}

export async function emitFeedPostCreated(post, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.FEED_POST_CREATED, {
    id: post.id,
    user_id: post.user_id,
    content: post.content,
    type: post.type,
  }, userId);
}

export async function emitUserCreated(user, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.USER_CREATED, {
    id: user.id,
    name: user.name,
    role: user.role,
  }, userId);
}

export async function emitUserUpdated(user, userId) {
  await emitWebhookEvent(WEBHOOK_EVENTS.USER_UPDATED, {
    id: user.id,
    name: user.name,
    role: user.role,
    goals: user.goals,
  }, userId);
}
