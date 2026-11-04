import { Router } from "express";
import * as QuoteController from "../controllers/quote.controller";

const route = Router();

route.post('/quotes', QuoteController.createQuote);
route.get('/deals/:dealId/quotes', QuoteController.getQuotesByDeal);
route.patch('/quotes/:id/status', QuoteController.updateQuoteStatus);

export default route;
