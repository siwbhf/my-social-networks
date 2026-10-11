import mongoose from 'mongoose';
import EventModel from '../models/event.mjs';
import GroupModel from '../models/group.mjs';

export const has = (list, userId) => list.some((id) => id.equals(userId));
export const isOrganizer = (event, user) => has(event.organizers, user._id);
export const isParticipant = (event, user) => isOrganizer(event, user) || has(event.participants, user._id);

export const fail = (res, code, message) => res.status(code).json({ code, message });

export function handleError(res, error) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return fail(res, 400, error.message);
  }
  if (error.code === 11000) {
    return fail(res, 409, 'Cette ressource existe déjà');
  }
  console.error(error);
  return fail(res, 500, error.message);
}

//un évènement public est visible par tous et un évènement privé uniquement par ses participants
export async function loadEvent(res, id, user = null) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return null;
  }
  const event = await EventModel.findById(id);
  const visible = event && (event.isPublic || (user && isParticipant(event, user)));
  if (!visible) {
    fail(res, 404, 'Event not found');
    return null;
  }
  return event;
}

export async function loadParticipantEvent(res, id, user) {
  const event = await loadEvent(res, id, user);
  if (!event) return null;
  if (!isParticipant(event, user)) {
    fail(res, 403, "Réservé aux participants de l'événement");
    return null;
  }
  return event;
}

export async function loadOrganizerEvent(res, id, user) {
  const event = await loadEvent(res, id, user);
  if (!event) return null;
  if (!isOrganizer(event, user)) {
    fail(res, 403, 'Réservé aux organisateurs');
    return null;
  }
  return event;
}

export async function loadGroup(res, id, user) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return null;
  }
  const group = await GroupModel.findById(id);
  if (!group) {
    fail(res, 404, 'Group not found');
    return null;
  }
  if (!has(group.members, user._id)) {
    if (group.type === 'secret') {
      fail(res, 404, 'Group not found');
    } else {
      fail(res, 403, 'Réservé aux membres du groupe');
    }
    return null;
  }
  return group;
}