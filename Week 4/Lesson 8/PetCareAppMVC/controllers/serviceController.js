const petModel = require('../models/petModel');
const serviceModel = require('../models/serviceModel');
const serviceBookingModel = require('../models/serviceBookingModel');

function formatLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPositiveInteger(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0;
}

function isValidBookingDate(rawDate) {
  if (typeof rawDate !== 'string') return false;

  const value = rawDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const [year, month, day] = value.split('-').map(Number);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() + 1 !== month ||
    parsedDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsedDate >= today;
}

function listServices(req, res) {
  const ownerId = req.session.user.id;

  petModel.getPetsByOwner(ownerId, (petErr, pets) => {
    if (petErr) {
      console.error('Error loading pets for services page:', petErr);
      return res.status(500).send('Unable to load pets.');
    }

    serviceModel.getActiveServices((serviceErr, services) => {
      if (serviceErr) {
        console.error('Error loading active services:', serviceErr);
        return res.status(500).send('Unable to load services.');
      }

      let selectedPetId = '';
      const requestedPetId = req.query.petId;

      if (requestedPetId !== undefined && requestedPetId !== null && requestedPetId !== '') {
        const isOwnedPet = pets.some((pet) => String(pet.id) === String(requestedPetId));
        if (isOwnedPet) {
          selectedPetId = String(requestedPetId);
        }
      }

      return res.render('services', {
        pets,
        services,
        selectedPetId,
        today: formatLocalDateString(new Date()),
        messages: req.flash('success'),
        errors: req.flash('error'),
        session: req.session
      });
    });
  });
}

function createBooking(req, res) {
  const submittedPetId = req.body.petId;
  const submittedServiceId = req.body.serviceId;
  const submittedDate = req.body.bookingDate;

  const petId = Number(submittedPetId);
  const serviceId = Number(submittedServiceId);

  if (!isPositiveInteger(submittedPetId) || !isPositiveInteger(submittedServiceId) || !isValidBookingDate(submittedDate)) {
    req.flash('error', 'Choose a pet, service, and valid booking date.');
    return res.redirect('/services');
  }

  const ownerId = req.session.user.id;
  const bookingDate = String(submittedDate).trim();

  serviceBookingModel.createPendingBooking(ownerId, petId, serviceId, bookingDate, (err, result) => {
    if (err) {
      console.error('Error creating pending booking:', err);
      req.flash('error', 'Unable to create the booking. Please try again.');
      return res.redirect(`/services?petId=${petId}`);
    }

    if (!result) {
      req.flash('error', 'That pet or service is unavailable for booking.');
      return res.redirect('/services');
    }

    req.flash('success', 'Booking created. Payment is pending; no payment has been processed.');
    return res.redirect('/bookings');
  });
}

function listBookings(req, res) {
  const ownerId = req.session.user.id;

  serviceBookingModel.getBookingsByOwner(ownerId, (err, bookings) => {
    if (err) {
      console.error('Error loading booking history:', err);
      return res.status(500).send('Unable to load booking history.');
    }

    return res.render('bookings', {
      bookings: bookings || [],
      messages: req.flash('success'),
      errors: req.flash('error'),
      session: req.session
    });
  });
}

module.exports = {
  listServices,
  createBooking,
  listBookings
};
