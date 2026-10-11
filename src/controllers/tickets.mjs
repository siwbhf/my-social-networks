import mongoose from 'mongoose';
import TicketTypeModel from '../models/ticketType.mjs';
import TicketModel from '../models/ticket.mjs';
import requireUser from '../middlewares/requireUser.mjs';
import { fail, handleError, loadEvent, loadOrganizerEvent } from '../helpers/access.mjs';

const publicView = (t) => ({
  _id: t._id,
  event: t.event,
  name: t.name,
  price: t.price,
  quantity: t.quantity,
  remaining: t.quantity - t.sold
});

async function loadTicketType(res, id, user) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return {};
  }
  const type = await TicketTypeModel.findById(id);
  if (!type) {
    fail(res, 404, 'Ticket type not found');
    return {};
  }
  const event = await loadOrganizerEvent(res, type.event, user);
  if (!event) return {};
  return { type, event };
}

const Tickets = class Tickets {
  constructor(app) {
    this.app = app;
    this.run();
  }

  createTicketType() {
    this.app.post('/events/:id/ticket-types', requireUser, async (req, res) => {
      try {
        const event = await loadOrganizerEvent(res, req.params.id, req.user);
        if (!event) return;
        if (!event.isPublic) {
          return fail(res, 400, 'La billetterie est réservée aux evenements publics');
        }

        const { name, price, quantity } = req.body;
        const type = await TicketTypeModel.create({ event: event._id, name, price, quantity });
        res.status(201).json(publicView(type));
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getTicketTypes() {
    //route publique: une personne exterieure doit pouvoir voir les billets disponibles
    this.app.get('/events/:id/ticket-types', async (req, res) => {
      try {
        const event = await loadEvent(res, req.params.id);
        if (!event) return;

        const types = await TicketTypeModel.find({ event: event._id });
        res.status(200).json(types.map(publicView));
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  updateTicketType() {
    this.app.put('/ticket-types/:id', requireUser, async (req, res) => {
      try {
        const { type } = await loadTicketType(res, req.params.id, req.user);
        if (!type) return;

        const { name, price, quantity } = req.body;
        if (quantity !== undefined && Number(quantity) < type.sold) {
          return fail(res, 400, `La quantité ne peut pas être inférieure aux billets déjà vendus (${type.sold})`);
        }
        if (name !== undefined) type.name = name;
        if (price !== undefined) type.price = price;
        if (quantity !== undefined) type.quantity = quantity;

        await type.save();
        res.status(200).json(publicView(type));
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deleteTicketType() {
    this.app.delete('/ticket-types/:id', requireUser, async (req, res) => {
      try {
        const { type } = await loadTicketType(res, req.params.id, req.user);
        if (!type) return;
        if (type.sold > 0) {
          return fail(res, 409, 'Impossible de supprimer un type de billet déjà vendu');
        }

        await type.deleteOne();
        res.status(200).json({ code: 200, message: 'Type de billet supprimé' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  buyTicket() {
    // route publique: l'acheteur est une personne extrieure sans compte
    this.app.post('/events/:id/tickets', async (req, res) => {
      try {
        const event = await loadEvent(res, req.params.id);
        if (!event) return;

        const { ticketType, firstname, lastname, email, address } = req.body;
        if (!mongoose.isValidObjectId(ticketType)) {
          return fail(res, 400, 'ticketType invalide');
        }
        const type = await TicketTypeModel.findOne({ _id: ticketType, event: event._id });
        if (!type) return fail(res, 404, 'Ticket type not found');

        const ticket = new TicketModel({
          event: event._id,
          ticketType: type._id,
          firstname,
          lastname,
          email,
          address
        });
        await ticket.validate();

        if (await TicketModel.exists({ event: event._id, email: ticket.email })) {
          return fail(res, 409, 'Cette personne a déjà un billet pour cet évenement');
        }

        // Réservation atomique d'une place : évite de dépasser le stock
        const reserved = await TicketTypeModel.findOneAndUpdate(
          { _id: type._id, $expr: { $lt: ['$sold', '$quantity'] } },
          { $inc: { sold: 1 } },
          { new: true }
        );
        if (!reserved) {
          return fail(res, 409, 'Plus de billets disponibles pour ce type');
        }

        try {
          await ticket.save();
        } catch (error) {
          await TicketTypeModel.updateOne({ _id: type._id }, { $inc: { sold: -1 } });
          throw error;
        }

        res.status(201).json(ticket);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getTickets() {
    this.app.get('/events/:id/tickets', requireUser, async (req, res) => {
      try {
        const event = await loadOrganizerEvent(res, req.params.id, req.user);
        if (!event) return;

        const tickets = await TicketModel.find({ event: event._id })
          .sort({ purchaseDate: 1 })
          .populate('ticketType', 'name price');
        res.status(200).json(tickets);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  run() {
    this.createTicketType();
    this.getTicketTypes();
    this.updateTicketType();
    this.deleteTicketType();
    this.buyTicket();
    this.getTickets();
  }
};

export default Tickets;