
import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import axios from 'axios';

import './App.css';

function App() {
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    fetchRecordings();
  }, []);

  useEffect(() => {
    let interval;

    if (isRecording) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(interval);
      setTimer(0);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stopRecording(() => {
        const blob = mediaRecorderRef.current.getBlob();
        chunksRef.current.push(blob);
        setIsRecording(false);
        onSave();
      });
    }
  };
  const onSave = async () => {
    try {
      const formData = new FormData();
      chunksRef.current.forEach((chunk, index) => {
        formData.append('recording', chunk, `recording${index}.webm`);
      });

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setRecordings(prevRecordings => [...prevRecordings, data]);
        chunksRef.current = [];
        fetchRecordings();
      } else {
        throw new Error('Failed to save the recording');
      }
    } catch (error) {
      console.error('Failed to save the recording:', error);
    }

  };

  const fetchRecordings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/recordings');
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      } else {
        throw new Error('Failed to fetch the recordings');
      }
    } catch (error) {
      console.error('Failed to fetch the recordings:', error);
    }
  };

  const renderRecordingsList = () => {
    if (recordings.length === 0) {
      return <p>No recordings available.</p>;
    }

    return (
      <ul>
        {recordings.map((recording, index) => (
          <li key={index} >
            <audio controls src={`http://localhost:5000/${recording?.path}`} />
            <button className='button' onClick={() => handleDelete(recording?._id)}>Delete</button>
          </li>
        ))}
      </ul>
    );
  };



  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/delete/${id}`);
      fetchRecordings();
    } catch (error) {
      console.error('Failed to delete the recording:', error);
    }
  };





  return (
    <div className="app-container">
      <h1>Voice Recording Project</h1>

      <h2>Record:</h2>
      {isRecording && <div className="timer">{isRecording ? timer : 0}s</div>}
      {!isRecording ? (
        <button className="start-button" onClick={startRecording}>
          Start Recording
        </button>
      ) : (
        <button className="start-button" onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      <h2>Recordings:</h2>
      {renderRecordingsList()}
    </div>
  );
}

export default App;
