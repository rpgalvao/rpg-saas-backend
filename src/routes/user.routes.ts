import { Router } from "express";
import * as UserController from "../controllers/user.controller";
import { uploadConfig } from "../libs/multer";
import multer from "multer";

const route = Router();
const upload = multer(uploadConfig);

route.post('/', UserController.createUser);
route.get('/', UserController.listUsers);
route.get('/:id', UserController.getUserById);
route.patch('/:id', upload.single('avatar'), UserController.updateUser);
route.delete('/:id', UserController.removeUser);
route.patch('/:id/toggle-status', UserController.toggleUserStatus);

export default route;