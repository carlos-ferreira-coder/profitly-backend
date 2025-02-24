import express from 'express'
import {
  login,
  logout,
  authCheck,
  authSelect,
  authCreate,
  authUpdate,
  authDelete,
} from '@controllers/controllerAuth'

const router = express.Router()

router.post('/login', login)
router.get('/logout', logout)
router.get('/check', authCheck)
router.get('/select/:key', authSelect)
router.post('/create', authCreate)
router.put('/update', authUpdate)
router.delete('/delete/:id', authDelete)

export default router
