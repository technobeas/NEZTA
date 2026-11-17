-- AddForeignKey
ALTER TABLE "bulk_order_status_history" ADD CONSTRAINT "bulk_order_status_history_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "bulk_order_enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
