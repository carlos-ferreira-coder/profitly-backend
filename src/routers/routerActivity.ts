import express from 'express'
import {
  activitySelect,
  activityCreate,
  activityUpdate,
  activityDelete,
} from '@controllers/controllerActivity'

const router = express.Router()

router.get('/select/:key', activitySelect)
router.post('/create', activityCreate)
router.put('/update', activityUpdate)
router.delete('/delete/:uuid', activityDelete)

export default router
