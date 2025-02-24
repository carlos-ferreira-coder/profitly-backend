import express from 'express'
import { taskSelect, taskCreate, taskUpdate, taskDelete } from '@controllers/controllerTask'

const router = express.Router()

router.get('/select/:key', taskSelect)
router.post('/create', taskCreate)
router.put('/update', taskUpdate)
router.delete('/delete/:uuid', taskDelete)

export default router
