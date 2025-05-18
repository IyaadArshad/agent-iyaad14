# STOCK & SALES MODULE

## Common

1. Data entry period need to control module wise and user group wise.
2. Need audit trails for all the transactions created in the system.
3. Material issue category access permission is required. (Same as location access permission)
4. All pending approvals need to display in the dashboard.
5. Stores functionalities required in TAB.
6. Payroll journal need to setup to automate to ERP. – Same as old system.
7. Fixed asset system. – Need to map the person having the device.
8. System should run with same decimal places.
9. Lorry GPS tracking

## Master Files

1. Product hierarchy defined as below.
     Brand master file. (SMAK / TRADING / RAW MATERIAL / FILLING)
     Group master file. (190 GLASS / WATER / PET / TETRA / RAW / SNACK / BITE)
     Category master file. (190 FRUIT / 190 MILK / WATER / TETRA / HOT & SPICY / KISSES)
     Sub Category master file. ( MILK / FRUIT LABLE / LID / CONTINER)
     Product master file.
2. Each master file is link to its upper layer, except sub category.
3. Only sub category and category is linked in product master. Others will automatically fill.
4. Maintain certification is required or not in product master file.
5. Maintain capacity of the product in product master file. (L)
6. Maintain QC item and non QC product in product master file.
7. Maintain expiry date mandatory products in product master file – Raw Batch.
8. QC parameter master file.
9. Option required updating product price for multiple price levels with effective date.
10. Multiple price level upload and download facility with excel.
11. Discount Free issues excel upload facility.
12. Pulp products need to map with the raw materials and maintain the conversion percentage.
13. New master file for validity period.
14. Maintain flag to identify locations which need to consider for reorder level report in the location
    master file.
15. Raw material products have both batch and FIFO products.
16. Finish good products only maintain in FIFO.
17. Need to maintain WIP products and Pulp products separately in the product master file.
18. Pulp is not maintained in batch. UOM is in Kg. Pulp can invoice.
19. WIP products need to match with finish goods.
20. WIP should not display for SOR/SO/Invoice/Returns/GRN/PO/GRNR


21. Issue category master file need to maintain the expense account. This is used to create the jobs
    where the non raw products are involved.
22. Reason master file need to identify whether empty bottle is add to the stock or not.

## Transaction

1. Purchase Order.
     Same purchase order cannot enter QC and NON QC products.
     Need to popup a validation massage when enter both products in the same po.
     Purchase order has two approve levels after the data entry.(Data entry / Purchasing
       Manager / Finance)
     Need separate entry for the bulk purchase order approval for both purchasing manager and
       finance.
     After purchase order approval, need the facility to send the approved purchase order as an
       email to the supplier.
     Need option to select the purchase order validity period from the validity master file.
     Print the validity period in the purchase order printout.
     Cannot raise purchase orders for the Products mentioned as certificate required in supplier
       product certificate master file and certificate is not attached.
     Cannot raise the purchase orders for the products ware the certificate expiry date is
       mandatory and the expiry date is already reached.
     After approval of the purchase order, need to send an email to the purchasing manager with
       the attachment.
     Purchase order approval time need to maintain a number serial.
2. Purchase Order Close Entry.
     Purchase order close entry required to close quantity wise and order wise.
     Purchase order close need to select the reason and required to enter the remarks.
3. QC Approve Entry.
     Only purchases orders with QC items should display in this transaction.
     Product wise multiple document attachment grids are required.
     Product wise separate two fields required to attach analysis report and internal document.
     This has 3 processes. ( Total Approved / Partial Reject and Approve / Total Reject)
     Need to fill the qc parameters product wise and option require to enter the values relevant
       to the parameters.
     QC approval entry required in both ERP and TAB.
     Can enter document with a separate entry or edit this entry for document attach only.
     Remark field and reject reason filed selection is required.
     Once approved by QC, pass this to the GRN.
4. Goods Received Note.
     Facility required entering manufacture date and expiry date. This will be mandatory for the
       products marked as expiry required in the product master.
     Need the Barcode sticker print option with the GRN.


```
 Option required entering the number of barcode print copies before printing.
 GRN with invoice and without invoice facility is required.
 GRN without invoice time supplier balances will not update. Only stocks will update.
 Accounts payable module service invoice will use to enter the supplier invoice once
received.
 Need to capture the supplier invoice number and date at the time of GRN.
 Do not allow to exceed the purchase order quantity at the time of GRN. If exceeds need to
raise a new purchase order for the exceeded quantity.
 Need to block the purchase orders display for GRN, if the validity period is exceeded.
 Supplier batch is not maintained, but internal batch number will need to maintain.
```
5. Good Received Return Note.
     Cannot raise GRNR for the GRN entered without invoice and invoice is not updated.
     This has to options with GRN and without GRN.
     Material return entry is required before the GRNR entry.
     Stocks will deduct in the material return entry, but supplier will update at the time GRNR
       entry only.
     Display all pending material return notes related to the selected supplier when raising a
       payment voucher in the accounts payable module.
     In GRNR without GRN price will be entered manually.
6. Sales Order Requisition Entry.
     Entered according to distributor wise.
     Stock and Sales Summary Report is generated based on Sales Order Requisition and
       available quantity.
     If sales order is cancelled, SOR can edit.
7. Sales Order Entry.
     Entry is based on Sales Order Requisition, after Stock and Sales Summary Report is
       generated.
     Can be done for normal sales reps (One Day Sale) as well as distributors (Centre Sale)
     Sales order requisition quantity can change in sales order.
     SO quantity can be greater than SOR quantity.
     SO quantity can be zero, if so massage should pop up but can continue.
     Sales order doesn’t have edit button.
     When enter the sales order need to deduct the MRN raised but not loaded quantity from
       quantity on hand.
8. Material Requisition Note.
     Entry can be done with or without Sales Order. (Without SO, MRNs are used for direct
       invoice loadings)
     No. of empty bottles equal to the no. of 190ml glass bottles entered in the MRN, are added
       automatically.
9. Loading Entry.
     User enters the Loading entry based on the MRN entry.
     Can have multiple loadings per date for a sales rep.
     Number of crates required need to add manually to the loading entry.


```
 Adding Crates is mandatory in the Loading entry, if Glass Bottles are included. If not a
message is given, but allowed to save.
```
10. Unloading Entry.
     Entered when the lorry returns.
     Keeps a link with Loading Date and Location (Sales Rep / Lorry)
     Stock is added to Main Location through an Issue Return Entry.
11. Invoice Entry.
     All invoices done on the route are entered.
     Invoices can be entered directly or based on Sales Orders or Quotations (Not currently
       used).
     Both Direct Invoices and Sales Order Based Invoices can be categorized as One Day Sale and
       Centre Sale. SO Based center sale is for Distributors.
     For One Day Sale, only Loadings done on the selected loading date are considered.
     For Centre Sale, all loadings done within the period are considered.
     Separate invoices should be entered for Finished Goods and Empty bottles/ crates.
     Payments can be entered in another tab of the invoice screen.
     Payment types are; Cash, Credit Card Payment, Direct Deposit, Cheque Payment and
       Credit Note / Advance / Overpayment Allocations.
12. Good Short / Excess Entry.
     The Short/ Excess entry is run for the relevant location and sales rep, based on the
       Unloading No.
     When the Unloading No. is selected, the Loading Quantity, Physical Quantity and Current
       Balances are displayed.
    Load Quantity = Loading Quantity
    Physical Quantity = Unloading Quantity
    Current Balance = Loading Quantity – Invoice Quantity (Van Location) +Sales Returns (Van
    Location) + Van to Van Transfer

```
Quantity to Be Adjusted = Physical Quantity – Current Balance
```
```
 Adjustment Addition or Deduction entries are passed to the Van Location, in order to empty
the Van Location.
```
13. Collection Entry.
     The Cash amount returned by the Sales Rep at the end of the route is entered here.
     Total sales rep expenses will be maintained in this entry.
     Total collected amount will be after deducting the rep expenses.
14. Cash Short & Excess Entry.
     Entered based on the Collection Entry, Rep Wise.
     If there is a short, a Debit Note is passed to the Sales Reps account.
     If there is an excess, an unallocated credit note is passed to the Sales Reps account.
15. Goods Transfer Note.
     This can have two scenarios. (With Requisition and Without Requisition)
     Need to introduce batch concept to transfer requisition entry.


```
 Can change the requested batch at the time of goods transfer.
```
16. Damage Return entry.
     Need to operate in both ERP and TAB.
     New entry required to capture these details. (Not Sales return)
     Categorize this with the reason. (Damaged / Expired / Short Expired / Spoiled)
     Reason master file need to maintain whether empty bottle will add to the stock or not
       according to the selected reason.
     New entry for Reissue against the damage entry.
     In Reissue entry can issue different product which are not in the damage entry. But total
       value needs to be equal.
     Reconciliation report according to the given format. (Total received damage returns Vs
       Agreed actual issue quantity)
17. Quotation evaluation.
     Finalized quotation will enter and others will attach to the quotation.
     Quotation approve with reason.
     Need to further discuss for non inventory items.
     Need discuss how to map with fixed asset.

## Reports

1. Reorder report needs to generate based on main stores only.
2. QC document attach status report.
3. Sales order requisition summery report need to display the QOH and MRN raised but not loaded
    quantity.
4. Lorry GPS tracking

# Accounts Receivable Module

## Master Files

1. Customer hierarchy defined as below.
     NSM
     RSM
     ASM
     Sales Supervisor
     Sales Rep
     Customer
2. Each master file is linked to its upper layer.


3. In the customer master file need to select only the sales rep code. Once it is selected, other master
    details should automatically fill.
4. Customer master file need to maintain the customer’s multiple branch details with branch code,
    branch name, Address, Sales rep and Route.

## Transaction

1. Distributor Bank Guarantee.
     New entry for bank guarantee.
     Need to print the cheque at this moment.
     Same as Advance entry.
     Cheque should proceed as normal Pd cheque process.
     This should not include to debtor reports.
     New report set for the bank guarantee module.
     Need a refund entry for multiple bank guarantees at once.
     Need a link to debtor credit note.
     Need to display in Pd reports.
2. Debtor Service Invoice.
     Need a new entry to enter service bills for the customer.
     This entry details will be same as supplier service invoice. But generates a debit note to the
       selected customer.

## Reports

1. In debtor outstanding report, need to remove the order by rep option in customer wise report
    option.

# Accounts Payable Module

## Master Files

1. Supplier hierarchy defined as below.
     Category
     Group
     Supplier
2. Supplier master need the option to attach multiple documents.
3. Need to maintain the expiry date document wise.
4. Supplier product certification master file.
     New master file required to add attach certificates to supplier product wise.
     Need to maintain whether certificate require expiry date or not.
     If required maintain the expiry date.


5. Need to maintain the debtor code for debtor creditor setoff entry.

## Transaction

1. Debtor Creditor Setoff Entry.
2. Service Purchase Order.
     Entry will be entered description base.
3. Service Goods Received Note.
     Entry will be entered description base.
     Stocks will not add to the stock.
     Accounts will not affect with this entry.
4. Service Invoice.
     Supplier will credit with this entry.
5. Supplier Evaluation Process.
     Need to map the suppliers with the relevant products.
     Check criteria’s.
       i. Order quantity received.
ii. On time delivery.
iii. Quantity as expected.
iv. Rejections over 5%.
v. Mandatory documents received or not.
vi. Documents expired or not.
     Need to generate the report according to the given format and criteria.
6.

## Reports

1. Supplier certificate expiry report. (Display supplier product wise expiry details which expires in less
    than 30 days).
2. New report for QC document attachment status.
3.

# Manufacturing Module

## Master Files

1. Line Master File.
     Need facility to maintain the capacity (Number of products quantity produce for an hour).
     Assign the products which can be produce under particular line.
2. Production Reason Category Master File.
     Will use to categories the reasons. (Damage reason, Return reason....)
3. Production Reason Master File.


```
 Can enter reasons used in production process.
 Need to map with a reason category.
 Need have an option whether the empty bottle will add to the stock or not.
```
4. Process Master File.
     Identify the process available to a particular line.
     Identify whether this is a machine or not. (This is to identify the break down time.)
     Need the facility to maintain the capacity for the Process line which is marked as machine.
     Need to map the relevant reasons for the process line.

## Transaction

1. Job Card Entry.
     This entry will be used to enter the daily production plan individual product wise.
     Will be entered against a production line.
     In this entry we will maintain 4 options for bottle washing, pulp creation, semi finish good
       and finish good.
2. Material Requisition Note.
     Need approval for this entry.
     Need to maintain batch in the MRN.
     This will be based on a job card, production line and a finish good product.
3. Material Issue Note.
     This is entered based on the material requisition note.
     Material issue note is entered against a particular production line and a finish good product.
     MIN time can change the requested batch.
4. Bottle Washing Process.
     Need to maintain two locations for unwashed and washed location.
     Using a MRN and transfer note bottles will add to unwashed location.
     Using another transfer note bottles will be added to wash location.
     At this point if damage bottles found need to pass adjustment deduction reason wise. Can
       have multiple reasons.
5. Damage Entry.
     This will be entered against a particular Job card.
     In the grid need to capture the Process, Raw product, Reason for Damage and the damage
       quantity.
     Need to filter the reasons according to the selected process line.
     If the selected reason is marked as “Add empty bottle” in the reason master files. Need to
       pass an internal adjustment addition entry to add the empty bottles stock to unwashed
       location.
     This entry needs an approval level.
6. Pulp Production.
     This entry also based on a job entry.
     Pulp is maintained in Kg.
     Raw product to pulp production is requested through material requisition note and Issued
       by material issue note based on the job entry.


```
 Using finish good note, use will be able to enter the pulp production. System will calculate
the production quantity based on the percentage mentioned in the product master file. But
user can enter the actual pulp quantity.
 Need to calculate the pulp per kilo cost.
```
7. Product code transfer process.
     This is used to transfer products from WIP to finish goods.
     Need to raise this entry based on selected product group.
     Once product group is selected, need to drop all the products with quantity on hand to the
       grid with the mapped product.
8. Finish Good Note.
     Finish good note is always based on a particular job.
     This will be used to the pulp production, semi finish production and finish good production
       process.
     Finish good run as FIFO.
     Finish good need to enter the finish good batch range.
     Will be entered against a production line and product code.
9. Material Issue Return Note.
     This will use to add the half filled or dirty bottles back to the bottle washer line.
     This will be entered against a particular job, production line and a finish good product.
       (Header Level)
     In the grid need to capture the Process Line, empty bottle product, Reason for Return and
       the return quantity.
     Need to filter the reasons according to the selected process line.
     If the selected reason is marked as “Add empty bottle” in the reason master files. Need to
       pass an internal adjustment addition entry to add the empty bottles stock to unwashed
       location.
     This entry needs an approval level.
10. Sample Return Note.
     Can use to add the empty glass bottles from semi finish good product in sample location to
       bottle washer line.
11. Empty Bottle in Process.
     This will be used to return the empty bottles used in mini stores inside the company
       premises.
12. Process Usage Entry.
     Will enter against a particular production line.
     This entry will capture the process line running time in hours and downtime in minutes.
13. Indirect Expense Entry.
     Product master file or product group master file need to maintain the indirect expenses
       quantity per finish good product.
     This entry will use to enter the daily total indirect expenses against a production line and
       product. (Ex. Water ,Man hours electricity) System will calculate the total quantity usage
       based on the daily production and the user need to enter the indirect expense cost in to the
       system.


```
 Need to get the furnace oil cost from the daily issue notes.
 Need to calculate the daily per unit indirect cost by using the above parameter and daily
total production.
```
## Inquiry

1. Finish good production trace back by entering finish good batch number.

## Reports

## 1. Production reports need the facility to filter according to all the product hierarchy.

## 2. Report need to generate for the production loss due to machine brake down.

# Petty Cash Module

## Master Files

1. Department Master file.
2. Petty cash product master file.

## Transaction

1. Purchasing MRN.
     Header level need to maintain the supplier, manual number, received date, and received
       quantity and remark fields.
     Grid level need to maintain MRN no, MRN date, Job category, department, description
       product name and quantity.
     MRN number can be blank.
     MRN number can duplicate.
     Supplier can select from system as well as user can type the supplier name.
     Product can be selected from system (Petty cash product MF) as well as user can type the
       Product name.
     Document attachment required.
     Need one approval for this entry.
     Approved records need to display for reimbursement.
     Reimbursement can recall in the petty cash entry.
     Daily summery report department wise. (Need report format)
2. Main Petty Cash.
     Float M/F – Amount entered against petty cash book.
     Petty cash payee (designation / department /fuel float(L) / Fuel float (Value)
     IOU needs to maintain manual number.
     IOU refund entry.
     Vouchers have two types. (approved / unapproved)
     Unapproved


```
i. Unapproved – Payee / voucher / job /amount / fuel L / fuel amount / description /
manual / department (not related to accounts)
ii. If job is selected as fuel, fuel (L) and amount needs to enter.
iii. Fuel liters not mandatory.
iv. Multiple vouchers single approval.
v. Approved entries go to reimbursement. (Need the tick option for approved entries
with select all / unselect all). Once reimbursement is saved payment voucher will
automatically generated and goes to cheque print.
vi. Job needs to involve in the auto generated payment voucher.
vii. Job need to identify the fuel separately.
 Approved
i. Approved – Payee / voucher / job /amount / fuel L / fuel amount / description /
manual / department.
ii. Purchasing department Reimbursement number need to display for selection.
iii. This will directly affect to accounts.
 Reimbursement voucher not directly hit to main account, but hit to an intermediate
account.
 Coin count.
```
# Sugar Tax Module

1. Quantity Percentage will differ monthly.
2. Report generated quarterly
3. Percentage will maintain in category.
4. Product master file need to maintain Tax free sugar level and actual sugar level.
5. Tax will calculate for actual level – tax free level.
6. Tax rate needs to enter at the time of entry per 100ml.
7. Invoice values needs to recalculate.
8. Maintain in separate table set.
9. Maintain in a separate sub module under stock and sales.
10. This will run monthly by selecting date range and will save temporally. But cannot run more than
    once for a particular month. If want need to cancel the previous entry and re enter.
11. Previous month cannot cancel, if this month is done.
12. New stock report according to the given format.
13. Need to tally the month end stock.
14. Don’t consider other transactions for this report.
15. Stock will calculate backward.



