import React, { useState } from 'react';
import { 
  Printer, Send, MessageCircle, Phone, CheckCircle2, ShieldCheck, 
  X, Copy, Check, Download, FileText, QrCode, Sparkles, Zap, Tag, MapPin 
} from 'lucide-react';
import { useToast } from './ToastNotification';

export default function InvoicePrintAndDispatchModal({ 
  isOpen, 
  onClose, 
  booking, 
  calculatedTotal = 0, 
  lineItems = [], 
  urgentSurcharge = 0, 
  activeOffer = null, 
  customDiscount = 0,
  defaultTab = 'print' // 'print' | 'dispatch'
}) {
  const [activeView, setActiveView] = useState(defaultTab);
  const [copiedType, setCopiedType] = useState(null);
  const { addToast } = useToast();

  if (!isOpen || !booking) return null;

  const invoiceNumber = `INV-AS-${booking.bookingId || '2026-001'}`;
  const invoiceDate = booking.deliveredAt 
    ? new Date(booking.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const customerName = booking.customerName || booking.guestName || 'Valued Customer';
  const customerPhone = booking.customerPhone || booking.guestPhone || '9876543210';
  const cleanPhone = customerPhone.replace(/\D/g, '');

  const itemsSubtotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const totalSubtotal = itemsSubtotal + (parseFloat(urgentSurcharge) || 0);

  let offerDiscountValue = 0;
  if (activeOffer) {
    if (activeOffer.discountType === 'percentage') {
      offerDiscountValue = (totalSubtotal * activeOffer.discountValue) / 100;
    } else {
      offerDiscountValue = Math.min(totalSubtotal, activeOffer.discountValue);
    }
  }

  const totalDiscount = offerDiscountValue + (parseFloat(customDiscount) || 0);
  const finalPayable = calculatedTotal > 0 ? calculatedTotal : Math.max(0, totalSubtotal - totalDiscount);

  // Clean location string
  const locationText = booking.location?.city 
    ? `${booking.location.city}${booking.location.address ? `, ${booking.location.address}` : ''} (${booking.location.pickupType || 'Workshop'})`
    : (booking.location?.address || 'VahanSangam Workshop');

  // WhatsApp Bill & Thank You Message (Natural, Friendly & Safe)
  const whatsappMessage = 
`🚗 *VAHANSANGAM SERVICE COMPLETION* 🚗
----------------------------------------
Dear *${customerName}*,

Thank you for visiting VahanSangam! Your *${booking.vehicleModel}* (${booking.plateNumber || 'MH-12-REG'}) service is done and ready.

📅 *Date:* ${invoiceDate}
📍 *Location:* ${locationText}
💰 *Total Bill:* ₹${finalPayable.toFixed(2)}
----------------------------------------
🙏 *Thank you for visiting us! Wishing you a safe and joyful drive ahead.* 🚗✨
📞 For any support: +91 98765 43210`;

  // SMS Text Message Bill & Thank You (Natural & Friendly)
  const smsMessage = `Thank you ${customerName} for visiting VahanSangam! Your ${booking.vehicleModel} (${booking.plateNumber || 'MH-12'}) is done. Total Bill: Rs.${finalPayable.toFixed(2)} on ${invoiceDate}. Location: ${locationText}. Wishing you a safe drive!`;


  // Copy handlers
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    addToast(`${type} text copied to clipboard!`, 'success', 2000);
    setTimeout(() => setCopiedType(null), 2500);
  };


  // WhatsApp link
  const handleOpenWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`;
    window.open(waUrl, '_blank');
    addToast('Opening WhatsApp with itemized bill...', 'info', 2000);
  };

  // SMS link
  const handleOpenSMS = () => {
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(smsMessage)}`;
    window.location.href = smsUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
      
      <div className="bg-[#0c1222] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col relative print:max-w-none print:w-full print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* MODAL CONTROLS HEADER (Hidden in Print) */}
        <div className="p-5 border-b border-white/10 bg-[#080d1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('print')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'print'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <FileText size={14} /> Printable Tax Invoice (PDF)
            </button>
            <button
              onClick={() => setActiveView('dispatch')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'dispatch'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Send size={14} /> Send WhatsApp & SMS Bill
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeView === 'print' && (
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* VIEW 1: PRINTABLE TAX INVOICE */}
        {activeView === 'print' && (
          <div className="p-6 sm:p-10 space-y-6 bg-slate-950 text-slate-100 print:bg-white print:text-black print:p-8" id="printable-invoice">
            
            {/* Invoice Top Header */}
            <div className="border-b border-white/10 print:border-black/20 pb-6 flex flex-col sm:flex-row justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow-md">
                    VS
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
                    VahanSangam Mobility Hub
                  </h1>
                </div>
                <p className="text-xs text-slate-400 print:text-gray-600">
                  Authorized Multi-Brand Automotive Service & Diagnostic Center
                </p>
                <p className="text-[11px] text-slate-400 print:text-gray-600 mt-1">
                  GSTIN: <span className="font-mono font-bold text-slate-300 print:text-black">27AAACA1234F1Z8</span> • CIN: U50100MH2026PTC099112
                </p>
                <p className="text-[11px] text-slate-400 print:text-gray-600">
                  Bay 4, VahanSangam SuperCenter, Baner High Street, Pune 411045
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 print:bg-gray-100 print:text-emerald-800 text-[11px] font-black tracking-wider uppercase border border-emerald-500/30 print:border-gray-300">
                  ● OFFICIAL TAX INVOICE
                </span>
                <p className="text-lg font-mono font-black text-sky-400 print:text-blue-700">{invoiceNumber}</p>
                <p className="text-xs text-slate-400 print:text-gray-600">Date: <span className="text-slate-200 print:text-black font-semibold">{invoiceDate}</span></p>
                <p className="text-xs text-slate-400 print:text-gray-600">Status: <span className="text-emerald-400 print:text-emerald-700 font-bold">PAID & DELIVERED</span></p>
              </div>
            </div>

            {/* Customer & Vehicle Information Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 print:border-black/15 print:bg-gray-50 space-y-1.5">
                <p className="font-bold text-sky-400 print:text-blue-700 uppercase text-[10px] tracking-wider">BILLED TO (CUSTOMER)</p>
                <p className="text-sm font-black text-white print:text-black">{customerName}</p>
                <p className="text-slate-300 print:text-gray-700 font-mono">Phone: +91 {customerPhone}</p>
                {booking.location && (
                  <p className="text-slate-300 print:text-gray-700">
                    City: <span className="font-bold">{booking.location.city || 'Pune'}</span> • {booking.location.pickupType || 'Workshop'}
                    {booking.location.address && <span className="block text-[11px] text-slate-400 print:text-gray-500">{booking.location.address}</span>}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 print:border-black/15 print:bg-gray-50 space-y-1.5">
                <p className="font-bold text-amber-400 print:text-amber-700 uppercase text-[10px] tracking-wider">VEHICLE & SERVICE PROFILE</p>
                <p className="text-sm font-black text-white print:text-black">{booking.vehicleModel}</p>
                <p className="text-slate-300 print:text-gray-700 font-mono font-bold">Plate No: {booking.plateNumber || 'MH-12-REG'}</p>
                <p className="text-slate-300 print:text-gray-700">Service: <span className="font-semibold text-amber-300 print:text-black">{booking.serviceType}</span></p>
                {booking.isUrgent && (
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 print:text-red-700 font-bold text-[10px]">
                    ⚡ Express Priority Bay Job
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-2xl border border-white/10 print:border-black/20 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/10 print:bg-gray-200 text-slate-300 print:text-black font-black uppercase text-[10px] tracking-wider">
                    <th className="p-3">#</th>
                    <th className="p-3">Item Description / Labor Task</th>
                    <th className="p-3">HSN/SAC</th>
                    <th className="p-3 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={item.id || index} className="text-slate-200 print:text-gray-800">
                      <td className="p-3 text-slate-400 print:text-gray-500 font-mono">{index + 1}</td>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-slate-400 print:text-gray-500 font-mono">998714</td>
                      <td className="p-3 text-right font-mono font-bold">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  {parseFloat(urgentSurcharge) > 0 && (
                    <tr className="text-amber-300 print:text-amber-900 bg-amber-500/5 print:bg-yellow-50 font-bold">
                      <td className="p-3 text-slate-400 print:text-gray-500 font-mono">*</td>
                      <td className="p-3">⚡ Urgent Express Bay Priority Surcharge</td>
                      <td className="p-3 font-mono">998719</td>
                      <td className="p-3 text-right font-mono">+₹{parseFloat(urgentSurcharge).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotals & Final Payable */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-2">
              <div className="max-w-xs space-y-2 text-[11px] text-slate-400 print:text-gray-600">
                <p className="font-bold text-slate-300 print:text-black">VahanSangam Service Acknowledgement:</p>
                <p>1. Service performed and vehicle delivered in inspected working condition.</p>
                <p>2. For any assistance or feedback, please contact VahanSangam Support at +91 98765 43210.</p>
              </div>


              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono text-white print:text-black">₹{totalSubtotal.toFixed(2)}</span>
                </div>

                {activeOffer && (
                  <div className="flex justify-between text-emerald-400 print:text-emerald-700 font-bold">
                    <span>Coupon ({activeOffer.code}):</span>
                    <span className="font-mono">-₹{offerDiscountValue.toFixed(2)}</span>
                  </div>
                )}

                {parseFloat(customDiscount) > 0 && (
                  <div className="flex justify-between text-emerald-400 print:text-emerald-700 font-bold">
                    <span>Manager Discount:</span>
                    <span className="font-mono">-₹{parseFloat(customDiscount).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400 print:text-gray-600 text-[11px]">
                  <span>GST (18% Included):</span>
                  <span className="font-mono">₹{(finalPayable * 0.18 / 1.18).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t-2 border-white/20 print:border-black text-sm font-black">
                  <span className="text-white print:text-black">Net Total Paid:</span>
                  <span className="text-xl font-mono text-amber-400 print:text-black">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Stamp & Authorized Signature */}
            <div className="pt-6 border-t border-white/10 print:border-gray-300 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 print:border-gray-400 flex items-center justify-center">
                  <ShieldCheck size={28} className="text-emerald-400 print:text-emerald-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-200 print:text-black">Quality Tested & Digitally Certified</p>
                  <p className="text-[10px] text-slate-400 print:text-gray-500">VahanSangam Certified EV Master Technician</p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="font-serif italic text-amber-300 print:text-blue-900 text-base font-bold">Alex Mercer</div>
                <p className="text-[10px] text-slate-400 print:text-gray-500 border-t border-white/20 print:border-gray-400 pt-1">
                  Authorized Signatory • VahanSangam Garage Operations
                </p>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: WHATSAPP & SMS DISPATCH CENTER */}
        {activeView === 'dispatch' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <Sparkles size={13} /> Delivery Notification Engine
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">
                Dispatch Bill & Thank You Message
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Instantly transmit the itemized digital tax bill and customer gratitude receipt directly to <span className="text-sky-300 font-mono font-bold">+91 {customerPhone}</span>.
              </p>
            </div>

            {/* Card 1: WhatsApp Bill Dispatch */}
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#0c1f1a] via-[#091613] to-[#070e17] space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      WhatsApp Full Itemized Bill & Thank You
                    </h3>
                    <p className="text-xs text-slate-400">Direct instant messaging via WhatsApp Web / App API</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopy(whatsappMessage, 'WhatsApp Bill')}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    {copiedType === 'WhatsApp Bill' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedType === 'WhatsApp Bill' ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                  >
                    <Send size={14} /> Send WhatsApp Bill
                  </button>
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/20 font-mono text-[11px] text-emerald-200/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {whatsappMessage}
              </div>
            </div>

            {/* Card 2: SMS / Text Message Dispatch */}
            <div className="p-6 rounded-3xl border border-sky-500/30 bg-gradient-to-br from-[#0e192c] via-[#0b1220] to-[#070a12] space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      SMS Text Message & Delivery Alert
                    </h3>
                    <p className="text-xs text-slate-400">Mobile SMS protocol with total amount and thank-you note</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopy(smsMessage, 'SMS Message')}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    {copiedType === 'SMS Message' ? <Check size={14} className="text-sky-400" /> : <Copy size={14} />}
                    {copiedType === 'SMS Message' ? 'Copied!' : 'Copy SMS'}
                  </button>
                  <button
                    onClick={handleOpenSMS}
                    className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
                  >
                    <Send size={14} /> Open Native SMS
                  </button>
                </div>
              </div>

              {/* SMS Preview Box */}
              <div className="p-4 rounded-2xl bg-black/60 border border-sky-500/20 font-mono text-[11px] text-sky-200/90 whitespace-pre-wrap leading-relaxed">
                {smsMessage}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setActiveView('print')}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5"
              >
                <FileText size={14} /> View Printable PDF
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-md"
              >
                Done & Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
