import { Request, Response } from "express";
import * as yup from "yup";
import { validation } from "../../shared/middlewares";
import { StatusCodes } from "http-status-codes";
import { Knex } from "../../database/knex";
import { ClientProvider } from "../../database/providers/clients";

interface IQueryProps {
  id?: number;
  page?: number;
  limit?: number;
  filter?: string;
}

//Middleware de validação
export const getAllValidation = validation((getSchema) => ({
  query: getSchema<IQueryProps>(
    yup.object().shape({
      page: yup.number().optional().moreThan(0),
      limit: yup.number().optional().moreThan(0),
      id: yup.number().integer().optional().default(0),
      filter: yup.string().optional()
    })
  )
}));

export const getAll = async (
  req: Request<{}, {}, {}, IQueryProps>,
  res: Response
) => {
  const trx = await Knex.transaction();
  const token = (req.headers.authorization ?? "").split(" ")[1];

  const result = await ClientProvider.getAll(
    req.query.page || 1,
    req.query.limit || 20,
    req.query.filter || "",
    Number(req.query.id),
    trx,
    token
  );

  console.log("CONTROLLER GETALL");
  console.log(result);

  const count = await ClientProvider.count(req.query.filter, trx, token);

  console.log("CONTROLLER COUNT");
  console.log(count);

  if (result instanceof Error) {
    await trx.rollback();
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: { default: result.message }
    });
  } else if (count instanceof Error) {
    await trx.rollback();
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: { default: count.message }
    });
  }
  await trx.commit();

  res.setHeader("access-control-expose-headers", "x-total-count");
  res.setHeader("x-total-count", count);

  return res.status(StatusCodes.OK).json(result);
};
