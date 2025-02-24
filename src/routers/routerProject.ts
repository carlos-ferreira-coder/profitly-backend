import express from 'express'
import {
  projectSelect,
  projectCreate,
  projectUpdate,
  projectDelete,
  budgetSelect,
  budgetUpdate,
  tasksSelect,
  tasksUpdate,
} from '@controllers/controllerProject'

const router = express.Router()

router.get('/select/:key', projectSelect)
router.post('/create', projectCreate)
router.put('/update', projectUpdate)
router.delete('/delete/:uuid', projectDelete)

router.get('/budget/select/:key', budgetSelect)
router.put('/budget/update', budgetUpdate)

router.get('/tasks/select/:key', tasksSelect)
router.put('/tasks/update', tasksUpdate)

export default router
