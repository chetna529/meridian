-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MarketOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

