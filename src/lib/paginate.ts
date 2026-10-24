import mongoose from "mongoose";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Options = {
  searchFields?: string[];
  filterFields?: string[]; // exact-match filters allowed from the query string
  sortFields?: string[];   // fields allowed in ?sort=
  baseFilter?: Record<string, any>; // always applied (role scoping)
  select?: string;
  populate?: any;
  defaultSort?: string;
};

/** Pagination + search + filtering + sorting, with whitelisted fields only. */
export async function paginate(Model: mongoose.Model<any>, query: Record<string, string>, o: Options = {}) {
  const { searchFields = [], filterFields = [], sortFields = [], baseFilter = {}, select = "", populate = "", defaultSort = "-createdAt" } = o;

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);

  const filter: Record<string, any> = { ...baseFilter };
  for (const f of filterFields) {
    if (query[f]) filter[f] = String(query[f]);
  }
  if (query.search && searchFields.length) {
    const rx = new RegExp(escapeRegex(query.search.slice(0, 50)), "i");
    filter.$and = [...(filter.$and || []), { $or: searchFields.map((f) => ({ [f]: rx })) }];
  }

  const parts = String(query.sort || defaultSort)
    .split(",")
    .filter((s) => s === defaultSort || sortFields.includes(s.replace(/^-/, "")));
  const sort = parts.length ? parts.join(" ") : defaultSort;

  const [data, total] = await Promise.all([
    Model.find(filter).select(select).populate(populate).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
