const Stripe = require("stripe");
const KEY_PRIVATE_STRIPE = process.env.KEY_PRIVATE_STRIPE;
const PRICE_ID = process.env.PRICE_ID;
const URL = process.env.URL;

const { User } = require("../DataBase/index");
const stripe = new Stripe(KEY_PRIVATE_STRIPE);

const paymentStripe = async (req, res) => {
  console.log(stripe);
  const { id_user } = req.body;
  if (!id_user) {
    return res.status(500).json({ message: "Se requiere el ID de usuario" });
  }
  const userr = await User.findByPk(id_user);
  if (!userr) {
    return res.status(400).json({ message: "Este usuario no existe" });
  }
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    metadata: {
      id_user: id_user,
    },
    mode: "payment",
    success_url: `${URL}/payment/success`,
    cancel_url: `${URL}/home`,
  });
  if (!session) {
    return res.status(404).json({ message: "Error al crear pago" });
  }
  const usuarioPago = await User.update(
    {
      idPayment: session.id,
    },
    {
      where: {
        id_user: id_user,
      },
    }
  );
  if (!usuarioPago) {
    return res
      .status(500)
      .json({ message: "El usuario no se pudo actualizar con éxito" });
  }
  return res.json({ url: session.url });
};

const getPayments = async (req, res) => {
  const transfers = await stripe.checkout.sessions.list();
  if (!transfers || transfers.length === 0) {
    return res
      .status(404)
      .json({ message: "No se encontraron órdenes activas" });
  }
  console.log(transfers.data);
  return res.status(200).json(transfers.data);
};

const checkUserPayment = async (req, res) => {
  const { idPayment } = req.body;
  if (!idPayment) {
    return res.status(500).json({ message: "No hay idPayment" });
  }
  const transfers = await stripe.checkout.sessions.list();
  if (!transfers || transfers.length === 0) {
    return res
      .status(404)
      .json({ message: "No se encontraron órdenes activas" });
  }
  const mapa = transfers.data.filter((t) => t.id === idPayment);
  return res.status(200).json({ message: mapa });
};

const getPaymentsEarns = async (req, res) => {
  const transfers = await stripe.checkout.sessions.list();
  if (!transfers || transfers.length === 0) {
    return res
      .status(404)
      .json({ message: "No se encontraron órdenes activas" });
  }

  const mapa = transfers.data.filter((t) => t.payment_status === "paid");
  const mapaa = mapa.map((el) => el.amount_total);
  return res
    .status(200)
    .json({ total_ganado: mapaa, trasacciones_exitosas: mapa });
};
module.exports = {
  paymentStripe,
  getPayments,
  checkUserPayment,
  getPaymentsEarns,
};
