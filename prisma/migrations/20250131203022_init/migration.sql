-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('Person', 'Enterprise');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('Activity', 'Expense');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('Person', 'Enterprise');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('Expense', 'Income', 'Transfer', 'Loan', 'Adjustment', 'Refund');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "cpf" TEXT NOT NULL,
    "photo" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL,
    "hourly_rate" DECIMAL(15,2),
    "auth_uuid" UUID NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL,
    "project" BOOLEAN NOT NULL,
    "personal" BOOLEAN NOT NULL,
    "financial" BOOLEAN NOT NULL,

    CONSTRAINT "auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "ClientType" NOT NULL,
    "cpf" TEXT,
    "cnpj" TEXT,
    "name" TEXT NOT NULL,
    "fantasy" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "client_uuid" UUID NOT NULL,
    "status_uuid" UUID NOT NULL,
    "budget_uuid" UUID NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_expense" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "TaskType" NOT NULL,
    "description" TEXT NOT NULL,
    "begin_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "hourly_rate" DECIMAL(15,2) DEFAULT 0,
    "cost" DECIMAL(15,2) DEFAULT 0,
    "revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status_uuid" UUID NOT NULL,
    "user_uuid" UUID,
    "project_uuid" UUID NOT NULL,
    "budget_uuid" UUID,

    CONSTRAINT "task_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "user_uuid" UUID NOT NULL,
    "task_uuid" UUID NOT NULL,
    "supplier_uuid" UUID,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "description" TEXT,
    "begin_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "hourly_rate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "user_uuid" UUID NOT NULL,
    "task_uuid" UUID NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "SupplierType" NOT NULL,
    "cpf" TEXT,
    "cnpj" TEXT,
    "name" TEXT NOT NULL,
    "fantasy" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL,
    "address" TEXT,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "client_uuid" UUID NOT NULL,
    "project_uuid" UUID,
    "user_uuid" UUID NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_uuid_key" ON "user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "user_cpf_key" ON "user"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_uuid_key" ON "auth"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "status_uuid_key" ON "status"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "client_uuid_key" ON "client"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "client_cpf_key" ON "client"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "client_cnpj_key" ON "client"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "client_email_key" ON "client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_uuid_key" ON "project"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "project_budget_uuid_key" ON "project"("budget_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "budget_uuid_key" ON "budget"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "task_expense_uuid_key" ON "task_expense"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "expense_uuid_key" ON "expense"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "activity_uuid_key" ON "activity"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_uuid_key" ON "supplier"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_cpf_key" ON "supplier"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_cnpj_key" ON "supplier"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_email_key" ON "supplier"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_uuid_key" ON "transaction"("uuid");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_auth_uuid_fkey" FOREIGN KEY ("auth_uuid") REFERENCES "auth"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_client_uuid_fkey" FOREIGN KEY ("client_uuid") REFERENCES "client"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_status_uuid_fkey" FOREIGN KEY ("status_uuid") REFERENCES "status"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_budget_uuid_fkey" FOREIGN KEY ("budget_uuid") REFERENCES "budget"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_expense" ADD CONSTRAINT "task_expense_status_uuid_fkey" FOREIGN KEY ("status_uuid") REFERENCES "status"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_expense" ADD CONSTRAINT "task_expense_project_uuid_fkey" FOREIGN KEY ("project_uuid") REFERENCES "project"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_expense" ADD CONSTRAINT "task_expense_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_expense" ADD CONSTRAINT "task_expense_budget_uuid_fkey" FOREIGN KEY ("budget_uuid") REFERENCES "budget"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_task_uuid_fkey" FOREIGN KEY ("task_uuid") REFERENCES "task_expense"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_supplier_uuid_fkey" FOREIGN KEY ("supplier_uuid") REFERENCES "supplier"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_task_uuid_fkey" FOREIGN KEY ("task_uuid") REFERENCES "task_expense"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_client_uuid_fkey" FOREIGN KEY ("client_uuid") REFERENCES "client"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_project_uuid_fkey" FOREIGN KEY ("project_uuid") REFERENCES "project"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "user"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
