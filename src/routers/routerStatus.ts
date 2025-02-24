import express from 'express'
import {
  statusSelect,
  statusCreate,
  statusUpdate,
  statusDelete,
} from '@controllers/controllerStatus'

const router = express.Router()

router.get('/select/:key', statusSelect)
router.post('/create', statusCreate)
router.put('/update', statusUpdate)
router.delete('/delete/:id', statusDelete)

export default router
