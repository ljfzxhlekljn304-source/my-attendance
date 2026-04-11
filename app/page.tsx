"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- 请保留你的真实 Supabase 信息 ---
const supabaseUrl = 'https://wvmcsjzxsovzhfwxzdlh.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_Zq6TsEhSAmMEwOFgwjxE5g_uothgtWo'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AttendanceApp() {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 16));

  async function fetchData() {
    const { data: coursesData } = await supabase.from('courses').select('*');
    const { data: recordsData } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false });
    setCourses((coursesData as any[]) || []);
    setRecords((recordsData as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCheckIn(courseId: any, status: string) {
    const { error } = await supabase
      .from('attendance_records')
      .insert([{ 
        course_id: courseId, 
        status: status,
        created_at: new Date(manualDate).toISOString()
      }]);
    if (!error) {
      fetchData();
      setSelectedCourse(null); // 打卡后关闭弹窗
    } else alert("操作失败");
  }

  async function deleteRecord(recordId: any) {
    if (!confirm("确定删除吗？")) return;
    const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
    if (!error) fetchData();
  }

  const getStats = (courseId: any, status: string) => records.filter(r => r.course_id === courseId && r.status === status).length;

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>;

  const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'];
  const dayMap: { [key: string]: number } = { '月曜日': 1, '火曜日': 2, '水曜日': 3, '木曜日': 4, '金曜日': 5 };
  
  // 对应图2的时间范围
  const timeSlots = [
    { label: '1', range: '9:00\n10:35' },
    { label: '2', range: '10:45\n12:20' },
    { label: '3', range: '13:10\n14:45' },
    { label: '4', range: '14:55\n16:30' },
    { label: '5', range: '16:40\n18:15' }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* 顶部补签条 - 保持小巧 */}
      <div className="bg-slate-100 p-2 border-b flex justify-between items-center px-4">
        <span className="text-[10px] font-bold text-slate-500">补签模式:</span>
        <input 
          type="datetime-local" 
          value={manualDate}
          onChange={(e) => setManualDate(e.target.value)}
          className="text-[10px] bg-transparent outline-none border border-slate-300 rounded px-1"
        />
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[380px]">
          <thead>
            <tr className="bg-white">
              <th className="border p-1 w-[12%] text-[11px] font-bold">春</th>
              {days.map(day => <th key={day} className="border p-1 text-[11px] font-bold">{day}</th>)}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, index) => (
              <tr key={index}>
                {/* 左侧时间栏 - 换行显示范围 */}
                <td className="border p-1 text-center bg-white">
                  <div className="text-[10px] font-bold leading-tight whitespace-pre-line">{slot.range}</div>
                </td>
                {days.map(day => {
                  const course = courses.find(c => c.day_of_week === dayMap[day] && c.time_slot.includes(slot.range.split('\n')[0]));
                  return (
                    <td 
                      key={day} 
                      onClick={() => course && setSelectedCourse(course)}
                      className={`border p-1 h-28 vertical-top transition-colors relative ${course ? 'bg-green-50/30 active:bg-green-100' : ''}`}
                    >
                      {course && (
                        <div className="flex flex-col h-full items-center justify-center text-center">
                          <div className="text-[10px] font-medium leading-tight text-slate-700">{course.name}</div>
                          <div className="text-[9px] text-slate-400 mt-1">{course.room}</div>
                          
                          {/* 统计小气泡 - 放在角落 */}
                          <div className="absolute top-0.5 right-0.5 flex gap-0.5 scale-[0.7]">
                            {getStats(course.id, '出席') > 0 && <span className="bg-green-500 w-2 h-2 rounded-full"></span>}
                            {getStats(course.id, '遅刻') > 0 && <span className="bg-orange-500 w-2 h-2 rounded-full"></span>}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部点击弹出的打卡面板 */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedCourse.name}</h2>
                <p className="text-sm text-slate-400">{selectedCourse.room}</p>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="text-2xl text-slate-300">&times;</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button onClick={() => handleCheckIn(selectedCourse.id, '出席')} className="flex flex-col items-center p-3 bg-green-50 rounded-xl active:scale-95 transition-transform">
                <span className="text-xl mb-1">✅</span>
                <span className="text-xs font-bold text-green-700">出席 ({getStats(selectedCourse.id, '出席')})</span>
              </button>
              <button onClick={() => handleCheckIn(selectedCourse.id, '遅刻')} className="flex flex-col items-center p-3 bg-orange-50 rounded-xl active:scale-95 transition-transform">
                <span className="text-xl mb-1">⏰</span>
                <span className="text-xs font-bold text-orange-700">迟到 ({getStats(selectedCourse.id, '遅刻')})</span>
              </button>
              <button onClick={() => handleCheckIn(selectedCourse.id, '欠席')} className="flex flex-col items-center p-3 bg-red-50 rounded-xl active:scale-95 transition-transform">
                <span className="text-xl mb-1">❌</span>
                <span className="text-xs font-bold text-red-700">缺席 ({getStats(selectedCourse.id, '欠席')})</span>
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto border-t pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">历史记录 (点击删除)</p>
              {records.filter(r => r.course_id === selectedCourse.id).map(record => (
                <div key={record.id} onClick={() => deleteRecord(record.id)} className="flex justify-between items-center py-2 border-b border-slate-50 active:bg-slate-50 px-1">
                  <span className="text-xs font-medium text-slate-600">{record.status}</span>
                  <span className="text-[10px] text-slate-400">{new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).getHours()}:{new Date(record.created_at).getMinutes()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}