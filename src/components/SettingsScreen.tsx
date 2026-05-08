import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { GarmentTemplate } from '../utils/templates';

export const SettingsScreen: React.FC = () => {
  const { unit, setUnit, garmentTemplates, updateGarmentTemplate, shopName, saveShopName } = useAppContext();
  const [activeView, setActiveView] = useState<'main' | 'templates' | 'edit_template'>('main');
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [tempShopName, setTempShopName] = useState(shopName);
  const [tempOwnerName, setTempOwnerName] = useState('Emma Richardson'); // For now, we'll store owner in local state or extend context later
  const [selectedTemplate, setSelectedTemplate] = useState<GarmentTemplate | null>(null);
  const [newPart, setNewPart] = useState('');

  const handleAddPart = () => {
    if (!newPart.trim() || !selectedTemplate) return;
    const cleanPart = newPart.trim().toLowerCase();
    if (selectedTemplate.parts.includes(cleanPart)) return;

    const newParts = [...selectedTemplate.parts, cleanPart];
    updateGarmentTemplate(selectedTemplate.name, newParts);
    setSelectedTemplate({ ...selectedTemplate, parts: newParts });
    setNewPart('');
  };

  const handleRemovePart = (part: string) => {
    if (!selectedTemplate) return;
    const newParts = selectedTemplate.parts.filter(p => p !== part);
    updateGarmentTemplate(selectedTemplate.name, newParts);
    setSelectedTemplate({ ...selectedTemplate, parts: newParts });
  };

  if (activeView === 'templates') {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#FDFDFD]">
        <div className="max-w-lg mx-auto w-full px-6 pt-6">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setActiveView('main')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:bg-gray-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Garment Templates</h1>
          </div>
          
          <div className="space-y-4">
            {garmentTemplates.map(template => (
              <div 
                key={template.name}
                onClick={() => { setSelectedTemplate(template); setActiveView('edit_template'); }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-[#0F172A] transition-colors"
              >
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{template.name}</h3>
                  <p className="text-gray-400 text-xs font-medium tracking-widest uppercase mt-1">{template.parts.length} REQUIRED PARTS</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeView === 'edit_template' && selectedTemplate) {
    return (
      <div className="flex flex-col min-h-full pb-32 bg-[#FDFDFD]">
        <div className="max-w-lg mx-auto w-full px-6 pt-6">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setActiveView('templates')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:bg-gray-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">{selectedTemplate.name} Template</h1>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CUSTOMIZE AI MEASUREMENTS</span>
            </div>
          </div>
          
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 mb-8">
            <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 mb-4">REQUIRED PARTS</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.parts.map(part => (
                <div key={part} className="bg-gray-50 border border-gray-200 rounded-full pl-4 pr-1 py-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700 capitalize">{part}</span>
                  <button onClick={() => handleRemovePart(part)} className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={newPart}
              onChange={e => setNewPart(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPart()}
              placeholder="E.g. Neck Drop, Bicep..."
              className="w-full h-14 bg-white border-2 border-gray-100 rounded-2xl pl-6 pr-14 text-gray-900 font-bold focus:border-[#0F172A] focus:ring-0 outline-none"
            />
            <button 
              onClick={handleAddPart}
              className="absolute right-2 top-2 bottom-2 w-10 bg-[#0F172A] text-white rounded-xl flex items-center justify-center hover:bg-black"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4 px-4">Adding a part here teaches the AI to listen for it specifically when you are recording a {selectedTemplate.name}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-32 bg-[#FDFDFD]">
      <div className="max-w-lg mx-auto w-full px-6 pt-6">
      
        {/* Top App Bar */}
        <div className="flex justify-between items-center bg-transparent mb-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shadow-sm">
              <img src={`https://ui-avatars.com/api/?name=${tempOwnerName}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">{shopName}</h1>
          </div>
          <button className="text-gray-900 hover:scale-105 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>

      <div className="px-1 space-y-8">
        
        {/* Profile Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isEditingShop ? (
              <div className="space-y-4 bg-white p-6 rounded-[28px] border border-[#0F172A] shadow-lg animate-in zoom-in-95">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Shop Name</label>
                  <input 
                    type="text" 
                    value={tempShopName} 
                    onChange={e => setTempShopName(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-gray-900 border-none focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Owner Name</label>
                  <input 
                    type="text" 
                    value={tempOwnerName} 
                    onChange={e => setTempOwnerName(e.target.value)}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-gray-900 border-none focus:ring-2 focus:ring-[#0F172A]/10"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { saveShopName(tempShopName); setIsEditingShop(false); }}
                    className="flex-1 h-12 bg-[#0F172A] text-white rounded-full text-[10px] font-bold uppercase tracking-widest"
                  >
                    Save Profile
                  </button>
                  <button 
                    onClick={() => { setTempShopName(shopName); setIsEditingShop(false); }}
                    className="px-6 h-12 bg-white text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-1">
                  {tempOwnerName}
                </h2>
                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">
                  {shopName} Owner
                </p>
              </>
            )}
          </div>
          {!isEditingShop && (
            <button 
              onClick={() => setIsEditingShop(true)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0F172A] hover:border-[#0F172A] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          )}
        </div>

        {/* System Preferences */}
        <section>
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 ml-1">
            System Preferences
          </h3>
          <div className="bg-[#F8F9FA] rounded-[32px] p-2 border border-gray-100">
            <div className="flex justify-between items-center bg-transparent px-4 py-4">
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6" y2="10"></line>
                    <line x1="10" y1="6" x2="10" y2="10"></line>
                    <line x1="14" y1="6" x2="14" y2="10"></line>
                    <line x1="18" y1="6" x2="18" y2="10"></line>
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-900">Measurement Units</span>
              </div>
              
              {/* Custom Toggle Switch */}
              <div className="relative flex items-center bg-gray-200/50 rounded-full p-1 cursor-pointer w-32 shadow-inner" onClick={() => setUnit(unit === 'in' ? 'cm' : 'in')}>
                <div 
                  className={`absolute w-[50%] h-[80%] bg-black rounded-full shadow-md transition-all duration-300 ease-out ${
                    unit === 'in' ? 'left-1' : 'left-[calc(50%-4px)]'
                  }`}
                ></div>
                <div className="relative z-10 flex w-full text-center">
                  <div className={`flex-1 text-[11px] font-bold tracking-widest uppercase py-2 transition-colors duration-300 ${unit === 'in' ? 'text-white' : 'text-gray-500'}`}>
                    Inches
                  </div>
                  <div className={`flex-1 text-[11px] font-bold tracking-widest uppercase py-2 transition-colors duration-300 ${unit === 'cm' ? 'text-white' : 'text-gray-500'}`}>
                    cm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operations */}
        <section>
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 ml-1">
            Operations
          </h3>
          <div className="bg-[#F8F9FA] rounded-[32px] border border-gray-100 overflow-hidden">
            
            {/* Manage Garment Templates */}
            <div onClick={() => setActiveView('templates')} className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"></path>
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-900">Manage Garment Templates</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="h-[1px] bg-gray-100 mx-6"></div>

            {/* Notification Settings */}
            <div className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span className="text-lg font-medium text-gray-900">Notification Settings</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>

          </div>
        </section>

      </div>
      </div>
    </div>
  );
};
