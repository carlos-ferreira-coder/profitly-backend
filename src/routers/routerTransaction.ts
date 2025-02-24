import express from 'express'
import {
  transactionSelect,
  transactionCreate,
  transactionUpdate,
  transactionDelete,
} from '@controllers/controllerTransaction'

const router = express.Router()

router.get('/select/:key', transactionSelect)
router.post('/create', transactionCreate)
router.put('/update', transactionUpdate)
router.delete('/delete/:uuid', transactionDelete)

export default router
