import mongoose from 'mongoose';

const m = (name) => mongoose.model(name);

export async function removeThreads(filter) {
  const threads = await m('Thread').find(filter, '_id');
  const ids = threads.map((t) => t._id);
  await m('Message').deleteMany({ thread: { $in: ids } });
  await m('Thread').deleteMany({ _id: { $in: ids } });
}

export async function removeAlbumData(filter) {
  const albums = await m('Album').find(filter, '_id');
  const albumIds = albums.map((a) => a._id);
  const photos = await m('Photo').find({ album: { $in: albumIds } }, '_id');
  const photoIds = photos.map((p) => p._id);
  await m('Comment').deleteMany({ photo: { $in: photoIds } });
  await m('Photo').deleteMany({ album: { $in: albumIds } });
  await m('Album').deleteMany({ _id: { $in: albumIds } });
}

export async function removePollData(filter) {
  const polls = await m('Poll').find(filter, '_id');
  const ids = polls.map((p) => p._id);
  await m('PollAnswer').deleteMany({ poll: { $in: ids } });
  await m('Poll').deleteMany({ _id: { $in: ids } });
}

export async function removeEventData(eventId) {
  await removeThreads({ event: eventId });
  await removeAlbumData({ event: eventId });
  await removePollData({ event: eventId });
  await m('Ticket').deleteMany({ event: eventId });
  await m('TicketType').deleteMany({ event: eventId });
}