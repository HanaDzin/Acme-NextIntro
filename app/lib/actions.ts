"use server";

import { revalidatePath } from "next/cache"; //to clear this cache and trigger a new request to the server
import { redirect } from "next/navigation";

import postgres from "postgres";
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

// type validation library
import { z } from "zod";

// define a schema that matches the shape of your form object.
//  This schema will validate the formData before saving it to a database
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(), //set to coerce (change) from a string to a number while also validating
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  //create an SQL query to insert the new invoice into database and pass in the variables
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  // once the database has been updated, the /dashboard/invoices path will be revalidated
  // and fresh data will be fetched from the server
  revalidatePath("/dashboard/invoices");

  // redirect the user back to the /dashboard/invoices page
  redirect("/dashboard/invoices");
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath("/dashboard/invoices");
}
