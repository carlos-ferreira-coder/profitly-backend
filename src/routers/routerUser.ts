import express from 'express'
import multer from 'multer'
import { storageUsersPhotos } from '@/multerConfig'
import {
  userSelect,
  userCreate,
  userUpdate,
  userUpdatePassword,
  userUpdatePhoto,
  userDeletePhoto,
  userDelete,
} from '@controllers/controllerUser'

const router = express.Router()
const upload = multer({ storage: storageUsersPhotos })

router.get('/select/:key', userSelect)
router.post('/create', userCreate)
router.put('/update', userUpdate)
router.patch('/update/password', userUpdatePassword)
router.patch('/update/photo', upload.single('photo'), userUpdatePhoto)
router.patch('/delete/photo', userDeletePhoto)
router.delete('/delete/:uuid', userDelete)

export default router
