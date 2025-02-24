import express from 'express'
import {
  clientSelect,
  clientCreate,
  clientUpdate,
  clientDelete,
} from '@controllers/controllerClient'

const router = express.Router()

router.get('/select/:key', clientSelect)
router.post('/create', clientCreate)
router.put('/update', clientUpdate)
router.delete('/delete/:uuid', clientDelete)

export default router
