// // npm run seed: creates demo accounts (development only)
// import bcrypt from "bcryptjs";
// import { connectDB } from "../src/lib/db";
// import Employee from "../src/models/Employee";
// import User from "../src/models/User";

// await connectDB();

// async function make(code: string, name: string, email: string, role: string, password: string, manager: unknown, basic: number) {
//   if (await User.exists({ email })) return Employee.findOne({ email });
//   const emp = await Employee.create({
//     employeeCode: code, name, email, department: role === "employee" ? "Engineering" : "HR",
//     designation: role, manager, joinDate: new Date("2024-01-15"), salary: { basic, allowances: Math.round(basic * 0.4) },
//   });
//   await User.create({ email, role, employee: emp._id, passwordHash: await bcrypt.hash(password, 12) });
//   console.log(`created ${role}: ${email} / ${password}`);
//   return emp;
// }

// await make("EMP001", "System Admin", "admin@company.com", "admin", "Admin@12345", null, 90000);
// await make("EMP002", "Hema HR", "hr@company.com", "hr", "Hr@12345678", null, 60000);
// const mgr = await make("EMP003", "Manoj Manager", "manager@company.com", "manager", "Manager@12345", null, 80000);
// await make("EMP004", "Anu Employee", "employee@company.com", "employee", "Employee@12345", mgr?._id, 50000);

// console.log("done");
// process.exit(0);


// npm run seed: creates demo accounts (development only)
import bcrypt from "bcryptjs";
import { connectDB } from "../src/lib/db";
import Employee from "../src/models/Employee";
import User from "../src/models/User";

async function make(code: string, name: string, email: string, role: string, password: string, manager: unknown, basic: number) {
  if (await User.exists({ email })) return Employee.findOne({ email });
  const emp = await Employee.create({
    employeeCode: code, name, email, department: role === "employee" ? "Engineering" : "HR",
    designation: role, manager, joinDate: new Date("2024-01-15"), salary: { basic, allowances: Math.round(basic * 0.4) },
  });
  await User.create({ email, role, employee: emp._id, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`created ${role}: ${email} / ${password}`);
  return emp;
}

async function main() {
  await connectDB();
  await make("EMP001", "System Admin", "admin@company.com", "admin", "Admin@12345", null, 90000);
  await make("EMP002", "Hema HR", "hr@company.com", "hr", "Hr@12345678", null, 60000);
  const mgr = await make("EMP003", "Manoj Manager", "manager@company.com", "manager", "Manager@12345", null, 80000);
  await make("EMP004", "Anu Employee", "employee@company.com", "employee", "Employee@12345", mgr?._id, 50000);
  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
