import { Request, Response } from "express";
import * as yup from "yup";
import { validation } from "../../shared/middlewares";
import { StatusCodes } from "http-status-codes";
import { IProduct } from "../../database/models";
import { ProductProvider } from "../../database/providers/products";
import { StockProvider } from "../../database/providers/stock";
import { Knex } from "../../database/knex";

interface IBodyProps extends Omit<IProduct, "id"> {} //Omit omite atributos

//Middleware de validação
export const createValidation = validation((getSchema) => ({
  body: getSchema<IBodyProps>(
    yup.object().shape({
      user_id: yup.number().required(),
      name: yup.string().required().min(3),
      price: yup.number().required(),
    })
  ),
}));

export const create = async (
  req: Request<{}, {}, IBodyProps>,
  res: Response
) => {
  const trx = await Knex.transaction();

  try {
    const result = await ProductProvider.create(req.body, trx);

    if (result instanceof Error) {
      await trx.rollback();
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        errors: {
          default: result.message,
        },
      });
    }

    const stockResult = await StockProvider.create(result.id, trx);

    if (stockResult instanceof Error) {
      await trx.rollback();
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        errors: {
          default: stockResult.message,
        },
      });
    }

    await trx.commit();
    return res.status(StatusCodes.CREATED).json({
      ...result,
      quantity: stockResult.quantity,
    });
  } catch (error) {
    await trx.rollback();
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: {
        default: "An error occurred during the transaction",
      },
    });
  }
};
