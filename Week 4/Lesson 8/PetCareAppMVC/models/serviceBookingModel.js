const db = require('../config/db');

function rollbackAndRelease(connection, callback) {
  connection.rollback(() => {
    connection.release();
    callback();
  });
}

function createPendingBooking(ownerId, petId, serviceId, bookingDate, callback) {
  db.getConnection((connectErr, connection) => {
    if (connectErr) {
      return callback(connectErr);
    }

    connection.beginTransaction((beginErr) => {
      if (beginErr) {
        connection.release();
        return callback(beginErr);
      }

      connection.query(
        'SELECT id FROM pets WHERE id = ? AND owner_id = ?',
        [petId, ownerId],
        (petErr, petRows) => {
          if (petErr) {
            return rollbackAndRelease(connection, () => callback(petErr));
          }

          if (!petRows || petRows.length === 0) {
            return rollbackAndRelease(connection, () => callback(null, null));
          }

          connection.query(
            'SELECT id, price FROM services WHERE id = ? AND is_active = 1',
            [serviceId],
            (serviceErr, serviceRows) => {
              if (serviceErr) {
                return rollbackAndRelease(connection, () => callback(serviceErr));
              }

              if (!serviceRows || serviceRows.length === 0) {
                return rollbackAndRelease(connection, () => callback(null, null));
              }

              const selectedService = serviceRows[0];

              connection.query(
                'INSERT INTO service_bookings (pet_id, service_id, booking_status, booked_price, booking_date) VALUES (?, ?, ?, ?, ?)',
                [petId, serviceId, 'pending', selectedService.price, bookingDate],
                (bookingErr, bookingResult) => {
                  if (bookingErr) {
                    return rollbackAndRelease(connection, () => callback(bookingErr));
                  }

                  const bookingId = bookingResult.insertId;

                  connection.query(
                    'INSERT INTO payments (booking_id, amount, payment_status, payment_reference) VALUES (?, ?, ?, ?)',
                    [bookingId, selectedService.price, 'pending', null],
                    (paymentErr, paymentResult) => {
                      if (paymentErr) {
                        return rollbackAndRelease(connection, () => callback(paymentErr));
                      }

                      connection.commit((commitErr) => {
                        if (commitErr) {
                          return rollbackAndRelease(connection, () => callback(commitErr));
                        }

                        connection.release();
                        callback(null, {
                          bookingId,
                          paymentId: paymentResult.insertId
                        });
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

function getBookingsByOwner(ownerId, callback) {
  const sql = `
    SELECT
      sb.id AS booking_id,
      sb.booking_date,
      p.name AS pet_name,
      s.name AS service_name,
      sb.booked_price,
      sb.booking_status,
      pay.payment_status
    FROM service_bookings AS sb
    INNER JOIN pets AS p ON p.id = sb.pet_id
    INNER JOIN services AS s ON s.id = sb.service_id
    LEFT JOIN payments AS pay ON pay.booking_id = sb.id
    WHERE p.owner_id = ?
    ORDER BY sb.created_at DESC, sb.id DESC
  `;

  db.query(sql, [ownerId], callback);
}

module.exports = {
  createPendingBooking,
  getBookingsByOwner
};
