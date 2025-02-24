import express from 'express'
import {
  expenseSelect,
  expenseCreate,
  expenseUpdate,
  expenseDelete,
} from '@controllers/controllerExpense'

const router = express.Router()

router.get('/select/:key', expenseSelect)
router.post('/create', expenseCreate)
router.put('/update', expenseUpdate)
router.delete('/delete/:uuid', expenseDelete)

export default router
