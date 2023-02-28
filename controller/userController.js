const { User, Login, Seccion_A, Seccion_B } = require("../DataBase/index.js");
const Stripe = require("stripe");
const KEY_PRIVATE_STRIPE = process.env.KEY_PRIVATE_STRIPE;
const URL = process.env.URL;
const stripe = new Stripe(KEY_PRIVATE_STRIPE);

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const bcrypt = require("bcrypt");
const generateRandomPassword = require("../utilities/generateRandomPassword");
const { sendEmail } = require("../utilities/sendEmail");
const { encrypt, decrypt } = require("../utilities/cifrado");

require("dotenv").config();
function validarEmail(valor) {
  if (
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      valor
    )
  ) {
    return "This email is corect";
  } else {
    return "This email is incorrect";
  }
}

const createUser = async (req, res, next) => {
  const { name, lastname, password, email, user_type } = req.body;

  if (!name || !lastname || !email || !password || !user_type) {
    return res.status(500).json({ message: "All fields are required" });
  }

  if (validarEmail(email) === "This email is incorrect") {
    return res.status(501).json({ message: "This mail doesn't exists" });
  }

  try {
    let user1 = await User.findOne({ where: { email } });
    // Si el correo ya está registrado, devuelvo un error
    if (user1) {
      return res
        .status(500)
        .json({ message: "Ya existe un usuario con este email" });
    }
    //   const date = date_birth.toString();
    const nombreE = encrypt(name);
    const apellidoE = encrypt(lastname);
    //  const dateE = encrypt(date);
    //  const countryE = encrypt(country);
    //   const regionE = encrypt(region);
    //   const genderE = encrypt(gender);

    // Creamos el nuevo usuario y lo guardamos en la DB
    const user = await User.create({
      name: nombreE,
      lastname: apellidoE,
      email,
      password,
      //   date_birth: dateE,
      //   country: countryE,
      //   region: regionE,
      //   gender: genderE,
      user_type,
    });

    // generamos el payload/body para generar el token
    if (!user) {
      return res
        .status(500)
        .json({ message: "No se pudo crear el usuario en la db" });
    }
    var aleatorio = Math.floor(Math.random() * 900000) + 100000;

    const mail = await sendEmail(
      "Verificacion de usuario",
      "",
      false,
      user.dataValues.email,
      `<h2>Creaste un usuario!</h2><div>${name}, necesitamos que verifiques tu usuario. Para lograrlo, necesitas utilizar el codigo:${aleatorio}.`
    );
    if (!mail) {
      return res
        .status(500)
        .json({ message: "No se pudo crear el usuario en la db" });
    }
    const payload = {
      user: {
        id: user.dataValues.id_user,
      },
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      {
        expiresIn: "1d",
      },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token: token,
          id_user: user.dataValues.id_user,
          codigo: aleatorio,
        });
      }
    );
  } catch (err) {
    return res.status(500).json({ error: err });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(505).json({
      message: "Se requiere un usuario o contraseña valido",
    });
  }

  try {
    const user = await User.findOne({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(405).json({
        message: "Este usuario no existe",
      });
    }

    const passwordfinal = bcrypt.compareSync(
      password,
      user.dataValues.password
    );

    if (!passwordfinal) {
      return res.status(404).json({
        message: "Contraseña inválida",
      });
    }
    if (user.dataValues.firstLogin === true) {
      const usuarioCambiado = await User.update(
        {
          // status: true,
          firstLogin: false,
        },
        {
          where: {
            id_user: user.dataValues.id_user,
          },
        }
      );
      if (usuarioCambiado) {
        try {
          const newLogin = await Login.create({
            id_user: user.dataValues.id_user,
          });

          const newLoginDef = await Promise.all(await newLogin.addUser(user));
          if (!newLogin || !newLoginDef) {
            return res.status(409).json({
              message: "No se pudo guardar el login",
            });
          }
          const nombre = decrypt(user.dataValues.name);
          const apellido = decrypt(user.dataValues.lastname);
          const usu = {
            id_user: user.dataValues.id_user,
            name: nombre,
            lastname: apellido,
            email: user.dataValues.email,
            user_type: user.dataValues.user_type,
            status: user.dataValues.status,
            terminos: true,
            progress: user.dataValues.progress,
            firstLogin: false,
            mail_accepted: true,
            createdAt: user.dataValues.createdAt,
            updatedAt: user.dataValues.updatedAt,
          };
          req.session.user = usu;

          const payload = {
            user: {
              id: user.dataValues.id_user,
            },
          };
          jwt.sign(
            payload,
            JWT_SECRET,
            {
              expiresIn: "1d",
            },
            (err, token) => {
              if (err) throw err;
              return res.status(200).json({
                token: token,
                id_user: user.dataValues.id_user,
                userLogged: true,
              });
            }
          );
        } catch (error) {
          return res.status(502).json({
            message:
              "Error al intentar conectar a la base de datos. Por favor, ponte en contacto con el administrador",
            error: err,
          });
        }
      } else {
        return res.status(403).json({
          message: "No se ha podido actualizar el usuario",
        });
      }
    }
    const newLogin = await Login.create({
      id_user: user.dataValues.id_user,
    });

    const newLoginDef = await Promise.all(await newLogin.addUser(user));
    if (!newLogin || !newLoginDef) {
      return res.status(409).json({
        message: "No se pudo guardar el login",
      });
    }
    const nombre = decrypt(user.dataValues.name);
    const apellido = decrypt(user.dataValues.lastname);
    const usu = {
      id_user: user.dataValues.id_user,
      name: nombre,
      lastname: apellido,
      email: user.dataValues.email,
      user_type: user.dataValues.user_type,
      status: user.dataValues.status,
      terminos: true,
      progress: user.dataValues.progress,
      firstLogin: false,
      mail_accepted: true,
      createdAt: user.dataValues.createdAt,
      updatedAt: user.dataValues.updatedAt,
      id_payment: user.dataValues.idPayment,
    };
    req.session.user = usu;
    const payload = {
      user: {
        id: user.dataValues.id_user,
      },
    };
    jwt.sign(
      payload,
      JWT_SECRET,
      {
        expiresIn: "1d",
      },
      (err, token) => {
        if (err) throw err;
        return res.status(200).json({
          token: token,
          id_user: user.dataValues.id_user,
          userLogged: true,
          usuario: usu,
        });
      }
    );
  } catch (err) {
    return res.status(510).json({
      message:
        "Error al intentar conectar a la base de datos. Por favor, ponte en contacto con el administrador",
      error: err,
    });
  }
};
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(500).json({
      message: "Email is required",
    });
  }

  let temporalPassword = generateRandomPassword();

  try {
    const user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No existe ningun usuario con este email" });
    }

    try {
      const update = await User.update(
        {
          password: temporalPassword,
        },
        {
          where: {
            email,
          },
        }
      );

      if (!update) {
        return res
          .status(404)
          .json({ message: "El usuario no se pudo actualizar" });
      }
      try {
        const nombre = decrypt(user.dataValues.name);
        await sendEmail(
          "Recuperación de contraseña",
          "",
          false,
          user.dataValues.email,
          `<h2>Contraseña temporal para su usuario en One Nexum</h2><div>${nombre}, su contraseña temporal es: <code>${temporalPassword}</code><br>Cambiela lo antes posible. Para cambiar su contraseña aprete el sigiuiente link <a href=${process.env.LINK_RESET_PASSWORD}>Apriete aqui</a></div>`
        );
        return res.status(200).json({
          message:
            "Contraseña cambiada con éxito. Se te ha enviado un correo con la contraseña nueva. Te sugerimos cambiarla pronto.",
        });
      } catch (error) {
        return res.status(400).json({
          message: `Error al enviar el correo. `,
        });
      }
    } catch (error) {
      return res.status(400).json({
        message: "No se pudo actualizar la contraseña",
      });
    }
  } catch (error) {
    return res.status(400).json({
      message: "No existe el usuario",
    });
  }
};
const resetPassword = async (req, res) => {
  const { oldPassword, newPassword, email } = req.body;
  if (!oldPassword || !newPassword || !email) {
    return res.status(500).json({ message: "Todos los campos son requeridos" });
  }
  if (newPassword === oldPassword) {
    return res.status(404).json({
      message: "Las contraseñas deben ser diferentes",
    });
  }

  try {
    const user = await User.findOne({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Este usuario no existe",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.dataValues.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Contraseña incorrecta",
      });
    }

    const contraseñaNueva = await User.update(
      {
        password: newPassword,
      },
      {
        where: {
          email: email,
        },
      }
    );
    if (contraseñaNueva) {
      const nombre = decrypt(user.dataValues.name);

      /* req.session.password = newPassword; */
      await sendEmail(
        "Cambio de contraseña",
        "",
        false,
        user.dataValues.email,
        `<h2>Cambio de contraseña!</h2><div>${nombre}, su contraseña ha sido cambiado con exito.</div>`
      );

      return res.status(200).json({
        message: "Contraseña cambiada con éxito",
      });
    } else {
      res.status(400).json({
        message: "No se pudo actualizar su contraseña",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message:
        "Error al intentar conectar a la base de datos. Por favor, ponte en contacto con el administrador",
    });
  }
};
const updateTerminos = async (req, res) => {
  const { id_user } = req.body;
  console.log(id_user);
  if (!id_user) {
    return res.status(500).json({ message: "Faltan campos" });
  }
  const usuarioCambiado = await User.update(
    {
      terminos: true,
    },
    {
      where: {
        id_user,
      },
    }
  );
  if (usuarioCambiado) {
    return res.status(200).json({ message: "Usuario cambiado correctamente" });
  } else {
    return res
      .status(404)
      .json({ message: "Error al intentar cambiar el usuario" });
  }
};
const getSession = async (req, res) => {
  // Si, por ejemplo, no hay nombre
  if (!req.session) {
    res.status(400).json({ message: "No existe una session en este momento" });
  }
  return res.status(200).json(req.session.user);
};
const updateMailAccepted = async (req, res) => {
  const { id_user } = req.body;

  if (!id_user) {
    return res.status(500).json({ message: "Faltan campos" });
  }
  const usuarioCambiado = await User.update(
    {
      mail_accepted: true,
    },
    {
      where: {
        id_user,
      },
    }
  );
  if (usuarioCambiado) {
    return res.status(200).json({ message: "Usuario cambiado correctamente" });
  } else {
    return res
      .status(404)
      .json({ message: "Error al intentar cambiar el usuario" });
  }
};

const updateUser = async (req, res, next) => {
  // const { name, lastname, password, email } = req.body;
  const { name, gender, dob, country, region, user } = req.body;

  //const { user } = req.session;

  if (!user) {
    return res.status(500).json({ message: "Debes llenar todos los campos" });
  }

  /*  if (validarEmail(email) === "This email is incorrect") {
    return res.status(501).json({ message: "Ingresa un email válido" });
  } */

  try {
    const nombreE = encrypt(name);
    const dateE = encrypt(dob);
    //  const dateE = encrypt(date);
    const countryE = encrypt(country);
    const regionE = encrypt(region);
    const genderE = encrypt(gender);
    // Creamos el nuevo usuario y lo guardamos en la DB
    const userr = await User.update(
      {
        name: nombreE,
        // lastname: apellidoE,
        // email,
        //  password,
        date_birth: dateE,
        country: countryE,
        region: regionE,
        gender: genderE,
        //user_type,
      },
      {
        where: {
          id_user: user,
        },
      }
    );

    if (userr) {
      return res.status(200).json({ message: "Usuario actualizado" });
    } else {
      return res
        .status(500)
        .json({ message: "No se pudo modificar el usuario en la db" });
    }
  } catch (err) {
    return res.status(500).json({ error: err });
  }
};


const updatePayment = async (req, res) => {
  const { id_user } = req.body;
  const usuario = await User.findByPk(id_user);

  if (!usuario) {
    return res.status(404).json({ message: "Este usuario no existe" });
  }
  try {
    const updateUser = await User.update(
      {
        status: true,
      },
      {
        where: {
          id_user: usuario.dataValues.id_user,
        },
      }
    );
    return res.status(200).json({ message: updateUser });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
};

const postSeccion_A = async (req, res) => {
  const { user } = req.session;

  if (!user.id_user) {
    return res.status(403).json({ message: "Falta informacion" });
  }
  const userr = await User.findByPk(user.id_user);
  if (!userr) {
    return res.status(403).json({ message: "Usuario inexistente" });
  }
  const newSeccion_A = await Seccion_A.create({
    id_user: userr.dataValues.id_user,
  });

  if (newSeccion_A) {
    return res.status(200).json({
      message: "Seccion A creada correctamente",
      data: newSeccion_A,
    });
  } else {
    return res.status(500).json({ message: "Error al crear Seccion A" });
  }
};
const postSeccionB = async (req, res) => {
  const { user } = req.session;

  if (!user.id_user) {
    return res.status(403).json({ message: "Falta informacion" });
  }
  const userr = await User.findByPk(user.id_user);
  if (!userr) {
    return res.status(403).json({ message: "Usuario inexistente" });
  }
  const newSeccionB = await Seccion_B.create({
    id_user: userr.dataValues.id_user,
  });

  if (newSeccionB) {
    return res.status(200).json({
      message: "Seccion A creada correctamente",
      data: newSeccionB,
    });
  } else {
    return res.status(500).json({ message: "Error al crear Seccion A" });
  }
};
const putSeccion_A = async (req, res) => {
  const {
    exercise1_started,
    exercise1_completed,
    exercise2_started,
    exercise2_completed,
    exercise3_started,
    exercise3_completed,
    bonus_started,
    bonus_completed,
  } = req.body;
  const { user } = req.session;
  if (!user.id_user) {
    return res.status(403).json({ message: "Falta informacion" });
  }
  const userr = await User.findByPk(user.id_user);
  if (!userr) {
    return res.status(403).json({ message: "Usuario inexistente" });
  }
  const newSeccion_A = await Seccion_A.create(
    {
      id_user: userr.dataValues.id_user,
    },
    {
      where: {
        id_user: userr.dataValues.id_user,
      },
    }
  );
};
module.exports = {
  login,
  createUser,
  resetPassword,
  forgotPassword,
  getSession,
  updateTerminos,
  updateMailAccepted,
  updateUser,
  updatePayment,
  postSeccion_A,
  postSeccionB,
  putSeccion_A,
};
