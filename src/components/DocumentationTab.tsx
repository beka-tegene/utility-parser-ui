"use client";

import { useState } from "react";
import {
  BookOpen,
  CreditCard,
  DollarSign,
  Receipt,
  Hash,
  User,
  Calendar,
  Database,
  Search,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Shield,
  Smartphone,
  Building2,
  Globe,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function DocumentationTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("introduction");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sections: DocSection[] = [
    {
      id: "introduction",
      title: "Introduction",
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600 mb-4">
            This guide helps you understand the field keys used when configuring utility payment template. 
            These keys are used to map data between your requests and vendor APIs.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <p className="text-sm text-blue-800">
              💡 <span className="font-medium">Tip:</span> Use the search bar above to quickly find the keys you need.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "account-fields",
      title: "Account Fields",
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Debit Account (Source Account)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "debit_account",
                "debit_account_number",
                "DEBIT_ACCOUNT_NUMBER",
                "DebitAccountNumber",
                "Debit_Account_Number",
                "Debit_Account",
                "DEBITACCTNO",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-blue-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-600" />
              Credit Account (Destination Account)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "credit_account",
                "credit_account_number",
                "CREDIT_ACCOUNT_NUMBER",
                "CreditAccountNumber",
                "Credit_Account_Number",
                "Credit_Account",
                "Credit_Acct_Number",
                "credit_acct_number",
                "CREDITACCTNO",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-green-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">General Account</h4>
            <div className="grid grid-cols-1 gap-2">
              {["account_number"].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-gray-700">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "amount-fields",
      title: "Amount Fields",
      icon: <DollarSign className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "amount",
            "Amount",
            "AMOUNT",
            "total_amount",
            "Total_Amount",
            "TotalAmount",
            "totalAmount",
            "billAmount",
            "Bill_Amount",
            "BillAmount",
            "BILL_AMOUNT",
            "debit_amount",
            "DEBIT_AMOUNT",
            "Debit_Amount",
            "credit_amount",
            "Credit_Amount",
            "CreditAmount",
            "total_summed_amount",
            "equivalent_etb_amount",
            "service_fee",
            "vat",
          ].map((key) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
              <code className="text-sm font-mono text-amber-600">{key}</code>
              <button
                onClick={() => handleCopy(key, key)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {copied === key ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "bill-reference",
      title: "Bill Reference Fields",
      icon: <Receipt className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "bill_ref_no",
            "billRefNo",
            "BillRefNo",
            "Bill_Ref_No",
            "BILL_REF_NO",
            "bill_id",
            "Bill_Id",
            "billId",
            "BillId",
            "BILL_ID",
          ].map((key) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
              <code className="text-sm font-mono text-purple-600">{key}</code>
              <button
                onClick={() => handleCopy(key, key)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {copied === key ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "transaction-id",
      title: "Transaction ID Fields",
      icon: <Hash className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Request ID</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "requestId",
                "RequestId",
                "request_id",
                "Request_ID",
                "REQUEST_ID",
                "requestID",
                "RequestID",
                "requestid",
                "REQUESTID",
                "Request_Id",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-cyan-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">End-to-End Transaction ID</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "End_To_End_Txn_Id",
                "endToEndTxnId",
                "EndToEndTxnId",
                "end_to_end_txn_id",
                "END_TO_END_TXN_ID",
                "EndToEndTxnID",
                "endToEndTxnID",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-cyan-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Other Transaction IDs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "transaction_id",
                "TransactionID",
                "cbeTxnRef",
                "cbe_txn_ref",
                "ft",
                "transaction_ref",
                "transaction_reference",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-cyan-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "customer-info",
      title: "Customer Information",
      icon: <User className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Customer Name</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "customer_name",
                "customerName",
                "CustomerName",
                "full_name",
                "FullName",
                "fullName",
                "debit_customer_name",
                "DebitCustomerName",
                "credit_customer_name",
                "CreditCustomerName",
              ].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-indigo-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Customer Contact</h4>
            <div className="grid grid-cols-1 gap-2">
              {["phone_number", "debit_customer_phone"].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-indigo-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Customer Identifiers</h4>
            <div className="grid grid-cols-1 gap-2">
              {["customer_id", "debit_cif", "user_id"].map((key) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-indigo-600">{key}</code>
                  <button
                    onClick={() => handleCopy(key, key)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "date-time",
      title: "Date & Time Variables",
      icon: <Calendar className="w-5 h-5" />,
      content: (
        <div className="space-y-3">
          {[
            { key: "current_date_yyyymmdd", desc: "Current date (YYYYMMDD)", example: "20260324" },
            { key: "current_date_yyyy_mm_dd", desc: "Current date (YYYY-MM-DD)", example: "2026-03-24" },
            { key: "current_timestamp", desc: "Unix timestamp (seconds)", example: "1774531200" },
            { key: "current_timestamp_ms", desc: "Unix timestamp (milliseconds)", example: "1774531200000" },
            { key: "current_datetime", desc: "Full date and time", example: "2026-03-24T12:00:00Z" },
            { key: "current_time_hhmmss", desc: "Current time (HHMMSS)", example: "120000" },
            { key: "current_time_hh_mm_ss", desc: "Current time (HH:MM:SS)", example: "12:00:00" },
            { key: "uuid", desc: "Unique identifier", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <code className="text-sm font-mono text-rose-600">{item.key}</code>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono">{item.example}</span>
                <button
                  onClick={() => handleCopy(item.key, item.key)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {copied === item.key ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "usage",
      title: "How to Use Mapping Keys",
      icon: <Database className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Basic Mapping Syntax</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 font-mono">
                {`{{request.account_number}}
{{accumulated.total_amount}}
{{context.credit_account}}`}
              </pre>
            </div>
            <button
              onClick={() => handleCopy("{{request.account_number}}", "syntax")}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {copied === "syntax" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy syntax
            </button>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Data Sources</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { prefix: "request.", desc: "Data from user's request" },
                { prefix: "accumulated.", desc: "Data collected from previous steps" },
                { prefix: "context.", desc: "Context variables set during workflow" },
                { prefix: "data.", desc: "Nested data objects" },
              ].map((item) => (
                <div key={item.prefix} className="p-3 bg-gray-50 rounded-lg border">
                  <code className="text-sm font-mono text-blue-600">{item.prefix}</code>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Key-Value Array Fields</h4>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "Key", desc: "Field name in the array" },
                  { key: "Value", desc: "Field value in the array" },
                  { key: "Additional_Fields", desc: "Array of extra key-value pairs" },
                ].map((item) => (
                  <div key={item.key}>
                    <code className="text-sm font-mono text-amber-600">{item.key}</code>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "examples",
      title: "Examples",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Bill Lookup Request</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 font-mono">
                {`Account Number: {{request.account_number}}
Bill Reference: {{request.bill_ref_no}}`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Payment Request</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 font-mono">
                {`Debit Account: {{request.debit_account_number}}
Credit Account: {{context.credit_account}}
Amount: {{accumulated.total_amount}}
Currency: {{accumulated.Currency}}
Transaction ID: {{uuid}}
Date: {{current_date_yyyy_mm_dd}}`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Response Mapping</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 font-mono">
                {`Customer Name: vendor_response.customer.name → customer_name
Bill Amount: vendor_response.bill.total → total_amount
Bill Reference: vendor_response.bill.id → bill_ref_no`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Using Accumulated Data</h4>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 font-mono">
                {`Total Amount: {{accumulated.Total_Amount}}
Bill Reference: {{accumulated.billRefNo}}
Account: {{accumulated.debit_account_number}}
Reason: {{accumulated.reason}}`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "quick-reference",
      title: "Quick Reference Card",
      icon: <Smartphone className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">Most Common Keys</h4>
            <div className="space-y-2">
              {[
                { purpose: "Source Account", key: "debit_account_number" },
                { purpose: "Destination Account", key: "credit_account_number" },
                { purpose: "Payment Amount", key: "total_amount" },
                { purpose: "Bill Reference", key: "bill_ref_no" },
                { purpose: "Customer Name", key: "customer_name" },
                { purpose: "Transaction ID", key: "transaction_id" },
                { purpose: "Currency", key: "currency" },
                { purpose: "Payment Reason", key: "reason" },
              ].map((item) => (
                <div key={item.purpose} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.purpose}:</span>
                  <code className="text-xs font-mono text-blue-600">{item.key}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-3">Auto-Generated Values</h4>
            <div className="space-y-2">
              {[
                { purpose: "Unique ID", key: "uuid" },
                { purpose: "Current Date", key: "current_date_yyyy_mm_dd" },
                { purpose: "Current Time", key: "current_time_hh_mm_ss" },
                { purpose: "Timestamp", key: "current_timestamp" },
              ].map((item) => (
                <div key={item.purpose} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.purpose}:</span>
                  <code className="text-xs font-mono text-amber-600">{item.key}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof section.content === "string"
        ? section.content.toLowerCase().includes(searchQuery.toLowerCase())
        : false)
  );

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-800">Documentation</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {section.icon}
              <span className="flex-1 text-left">{section.title}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === section.id ? "rotate-90" : ""}`} />
            </button>
          ))}
        </div>
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            CBE Utility Parser v1.0
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {filteredSections.find((s) => s.id === activeSection)?.content}
        </div>
      </div>
    </div>
  );
}
export default DocumentationTab;