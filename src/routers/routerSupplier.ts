import express from 'express'
import {
  supplierSelect,
  supplierCreate,
  supplierUpdate,
  supplierDelete,
} from '@controllers/controllerSupplier'

const router = express.Router()

router.get('/select/:key', supplierSelect)
router.post('/create', supplierCreate)
router.put('/update', supplierUpdate)
router.delete('/delete/:uuid', supplierDelete)

export default router
