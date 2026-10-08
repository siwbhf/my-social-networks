import UserModel from '../models/user.mjs';

const Users = class Users {
  constructor(app, connect){
    this.app = app;
    this.connect = connect;

    this.run();
  }

  createUser() {
    this.app.post('/users', async (req, res) => {
      try {
        const { firstname, lastname, email, age } = req.body;

        const newUser = new UserModel({ firstname, lastname, email, age });
        await newUser.save();

        res.status(201).json(newUser);
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ code: 409, message: 'Email déjà utilisé' });
        }
        if (error.name === 'ValidationError') {
          return res.status(400).json({ code: 400, message: error.message });
        }
        console.log(error);
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  updateUser() {
    this.app.put('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { firstname, lastname, email, age } = req.body;

        const updatedUser = await UserModel.findByIdAndUpdate(
          id,
          {firstname, lastname, email, age},
          {new: true, runValidators: true}
        );

        if (!updatedUser) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }
        
        res.status(200).json(updatedUser);
      } catch {
        res.status(500).json({
          code: 500,
          message: 'Internal Server Error'
        });
      }
    });
}

  getUserById() {
    this.app.get('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const user = await UserModel.findById(id);
        
        if (!user) {
          return res.status(404).json({
            code: 404,
            message: 'User not found'
          });
        }
        res.status(200).json(user);
      } catch {
        res.status(500).json({
          code: 500,
          message: 'Internal Server Error'
        });
      }
    });
  }

  getUsers() {
    this.app.get('/users', async (req, res) => {
      try {
        const users = await UserModel.find();
        res.status(200).json(users);
      } catch {
        res.status(500).json({
          code: 500,
          message: 'Internal Server Error'
        });
      }
    });
  }
  run() {
    this.createUser();
    this.updateUser();
    this.getUserById();
    this.getUsers();
  }
};

export default Users;