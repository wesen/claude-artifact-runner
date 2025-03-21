import { useState, ChangeEvent } from 'react';

const CalendarMeetingCreator = () => {
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMeetingData({
      ...meetingData,
      [name]: value
    });
  };

  const generateICS = () => {
    // Format dates for ICS
    const formatDate = (date: string, time: string): string => {
      const dateObj = new Date(`${date}T${time}`);
      return dateObj.toISOString().replace(/-|:|\.\d{3}/g, '');
    };

    // Validate inputs
    if (!meetingData.title || !meetingData.startDate || !meetingData.endDate) {
      alert('Please fill in required fields (Title, Start Date, End Date)');
      return;
    }

    // Create ICS content
    const startDateTime = formatDate(meetingData.startDate, meetingData.startTime);
    const endDateTime = formatDate(meetingData.endDate, meetingData.endTime);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'PRODID:-//Calendar Meeting Creator//EN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:${meetingData.title}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `LOCATION:${meetingData.location}`,
      `DESCRIPTION:${meetingData.description}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create downloadable link
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${meetingData.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-xl font-bold mb-4">Create Calendar Meeting</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            name="title"
            value={meetingData.title}
            onChange={handleInputChange}
            className="mt-1 p-2 w-full border rounded-md"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={meetingData.description}
            onChange={handleInputChange}
            className="mt-1 p-2 w-full border rounded-md"
            rows={2}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            name="location"
            value={meetingData.location}
            onChange={handleInputChange}
            className="mt-1 p-2 w-full border rounded-md"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={meetingData.startDate}
              onChange={handleInputChange}
              className="mt-1 p-2 w-full border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              name="startTime"
              value={meetingData.startTime}
              onChange={handleInputChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date *</label>
            <input
              type="date"
              name="endDate"
              value={meetingData.endDate}
              onChange={handleInputChange}
              className="mt-1 p-2 w-full border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="time"
              name="endTime"
              value={meetingData.endTime}
              onChange={handleInputChange}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
        </div>
        
        <button
          onClick={generateICS}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Download ICS File
        </button>
      </div>
    </div>
  );
};

export default CalendarMeetingCreator;