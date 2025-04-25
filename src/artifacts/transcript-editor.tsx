import { useRef, useMemo, useState } from 'react';
// Import the prompt text as a raw string
import promptText from '../../tests/transcript-editor/prompt.txt?raw';
// Import utilities
import { 
  TranscriptSegment, 
  Topic, 
  SegmentGroup,
  formatTime, 
  groupConsecutiveSegments 
} from '../utils/transcriptUtils';

// Import prompt templates
import blogArticlePrompt from '../prompts/transcript-editor/blog-article.txt?raw';
import subtopicsTweetsPrompt from '../prompts/transcript-editor/subtopics-tweets.txt?raw';

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  setTranscriptLoading, 
  setTranscriptData, 
  setTranscriptError 
} from '../store/transcriptSlice';
import { 
  setTopicsLoading, 
  setTopicsData, 
  setTopicsError, 
  setSelectedTopic 
} from '../store/topicsSlice';
import { 
  toggleDebugInfo, 
  copyWithFeedback,
  setPromptModal
} from '../store/uiSlice';
import {
  selectParsedTranscript,
  selectRawTranscript,
  selectSpecificTopics,
  selectGeneralTopics,
  selectSelectedTopic,
  selectSelectedTopicRanges,
  selectShowDebugInfo,
  selectPromptCopied,
  selectTopicInfoCopied,
  selectTranscriptViewCopied,
  selectShowPromptModal,
  selectPromptModalContent,
  selectPromptModalTitle
} from '../store/selectors';

// Controls console logging
const isDebug = process.env.NODE_ENV === 'development';

// Wrapper for debug logging
const debugLog = (...args: unknown[]) => {
  if (isDebug) {
    console.log(...args);
  }
};

// PromptModal Component
const PromptModal = () => {
  const dispatch = useAppDispatch();
  const showModal = useAppSelector(selectShowPromptModal);
  const modalContent = useAppSelector(selectPromptModalContent);
  const modalTitle = useAppSelector(selectPromptModalTitle);
  const [copied, setCopied] = useState(false);

  if (!showModal) return null;

  const handleCopy = () => {
    if (!modalContent) return;
    
    navigator.clipboard.writeText(modalContent)
      .then(() => {
        setCopied(true);
        // Reset after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy text.');
      });
  };

  const handleClose = () => {
    dispatch(setPromptModal({ show: false }));
    setCopied(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-3/4 max-w-4xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{modalTitle}</h3>
          <div className="flex items-center space-x-2">
            <button 
              className={`p-2 rounded ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={handleCopy}
            >
              {copied ? (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </span>
              )}
            </button>
            <button 
              className="p-2 rounded bg-gray-100 hover:bg-gray-200"
              onClick={handleClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border text-sm">{modalContent}</pre>
        </div>
      </div>
    </div>
  );
};

const TranscriptAnalyzer = () => {
  // Use Redux selectors to get state
  const parsedTranscript = useAppSelector(selectParsedTranscript);
  const transcript = useAppSelector(selectRawTranscript);
  const specificTopics = useAppSelector(selectSpecificTopics);
  const generalTopics = useAppSelector(selectGeneralTopics);
  const selectedTopic = useAppSelector(selectSelectedTopic);
  const topicRanges = useAppSelector(selectSelectedTopicRanges);
  const showDebugInfo = useAppSelector(selectShowDebugInfo);
  const promptCopied = useAppSelector(selectPromptCopied);
  const topicInfoCopied = useAppSelector(selectTopicInfoCopied);
  const transcriptViewCopied = useAppSelector(selectTranscriptViewCopied);
  
  const dispatch = useAppDispatch();
  const transcriptRef = useRef<HTMLDivElement>(null);

  const handleTranscriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch(setTranscriptLoading());
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        dispatch(setTranscriptError('Failed to read file'));
        return;
      }
      dispatch(setTranscriptData(text));
    };
    reader.onerror = () => {
      dispatch(setTranscriptError('Error reading file'));
    };
    reader.readAsText(file);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch(setTopicsLoading());
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        dispatch(setTopicsData(json));
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        dispatch(setTopicsError('Invalid JSON file'));
        alert("Invalid JSON file");
      }
    };
    reader.onerror = () => {
      dispatch(setTopicsError('Error reading file'));
    };
    reader.readAsText(file);
  };

  const handleTopicClick = (topic: Topic, category: string) => {
    debugLog("Topic clicked:", topic, "Category:", category);
    dispatch(setSelectedTopic({ topic, category }));
    
    // Scroll to the first occurrence after the state update
    if (topicRanges.length > 0 && transcriptRef.current) {
      setTimeout(() => {
        const firstHighlight = transcriptRef.current?.querySelector('.highlight');
        if (firstHighlight) {
          firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const isSegmentInRange = (segment: TranscriptSegment) => {
    if (!selectedTopic) return false;
    
    const isInRange = topicRanges.some(range => {
      const check = (segment.startTime >= range.start && segment.startTime <= range.end) ||
                    (segment.endTime >= range.start && segment.endTime <= range.end) ||
                    (segment.startTime <= range.start && segment.endTime >= range.end);
      return check;
    });
    
    return isInRange;
  };
  
  // Memoize the filtered and grouped segments
  const displayedContent = useMemo(() => {
    const filteredSegments = parsedTranscript.filter(segment => !selectedTopic || isSegmentInRange(segment));
    
    if (selectedTopic) {
      // If a topic is selected, group the filtered segments
      return groupConsecutiveSegments(parsedTranscript, filteredSegments);
    } else {
      // If no topic is selected, return individual segments
      return filteredSegments;
    }
  }, [parsedTranscript, selectedTopic, topicRanges]); // Dependencies for useMemo

  // Check if there's a significant time gap between segments (over 2 minutes)
  const isSignificantTimeGap = (current: TranscriptSegment, previous: TranscriptSegment): boolean => {
    // 120 seconds = 2 minutes
    return (current.startTime - previous.endTime) > 120;
  };

  // Function to apply a prompt template with current data
  const applyPromptTemplate = (promptTemplate: string): string => {
    if (!selectedTopic) {
      alert('Please select a topic first.');
      return '';
    }

    let filledPrompt = promptTemplate;
    
    // Get the displayed transcript content as text
    let transcriptContent = '';
    displayedContent.forEach(item => {
      if ('segments' in item) {
        // Grouped segment block
        const group = item as SegmentGroup;
        group.segments.forEach(segment => {
          transcriptContent += segment.text + '\n';
        });
      } else {
        // Individual segment
        const segment = item as TranscriptSegment;
        transcriptContent += segment.text + '\n';
      }
    });

    // Get the time range as string
    const timeRanges = selectedTopic.time_ranges.map(range => `${range.start} - ${range.end}`).join(', ');
    
    // Replace template variables
    filledPrompt = filledPrompt
      .replace('{{topic}}', selectedTopic.name)
      .replace('{{time_range}}', timeRanges)
      .replace('{{transcript}}', transcriptContent)
      .replace('{{additional_context}}', selectedTopic.information || '');
    
    return filledPrompt;
  };

  // Handlers for prompt application and copy
  const handleShowBlogArticlePrompt = () => {
    const filledPrompt = applyPromptTemplate(blogArticlePrompt);
    if (filledPrompt) {
      dispatch(setPromptModal({ 
        show: true, 
        content: filledPrompt, 
        title: `Blog Article Prompt for "${selectedTopic?.name}"` 
      }));
    }
  };

  const handleShowSubtopicsPrompt = () => {
    const filledPrompt = applyPromptTemplate(subtopicsTweetsPrompt);
    if (filledPrompt) {
      dispatch(setPromptModal({ 
        show: true, 
        content: filledPrompt, 
        title: `Subtopics & Tweets Prompt for "${selectedTopic?.name}"` 
      }));
    }
  };

  // Specific copy handlers
  const handleCopyPrompt = () => {
    dispatch(copyWithFeedback(promptText, 'promptCopied'));
  };

  const handleCopyTopicInfo = () => {
    if (!selectedTopic) return;
    const topicInfoString = `Topic: ${selectedTopic.name}\n\nInformation:\n${selectedTopic.information}\n\nKey Quotes:\n${selectedTopic.key_quotes.map(q => `- ${q}`).join('\n')}\n\nTime Ranges:\n${selectedTopic.time_ranges.map(r => `- ${r.start} - ${r.end}`).join('\n')}\n`;
    dispatch(copyWithFeedback(topicInfoString, 'topicInfoCopied'));
  };

  const handleCopyTranscriptView = () => {
    let transcriptString = "";
    if (displayedContent.length === 0) return;

    displayedContent.forEach(item => {
      if ('segments' in item) {
        // Grouped segment block
        const group = item as SegmentGroup;
        transcriptString += `${formatTime(group.firstSegment.startTime)}-${formatTime(group.lastSegment.endTime)}\n`;
        
        // Process segments with potential time gaps
        let lastSegment: TranscriptSegment | null = null;
        group.segments.forEach(segment => {
          if (lastSegment && isSignificantTimeGap(segment, lastSegment)) {
            // Insert timestamp if gap is more than 2 minutes
            transcriptString += `\n[${formatTime(segment.startTime)}]\n`;
          }
          transcriptString += segment.text + '\n';
          lastSegment = segment;
        });
        
        transcriptString += '\n';
      } else {
        // Individual segment
        const segment = item as TranscriptSegment;
        transcriptString += `${formatTime(segment.startTime)}-${formatTime(segment.endTime)}\n`;
        transcriptString += segment.text + '\n\n';
      }
    });

    dispatch(copyWithFeedback(transcriptString.trim(), 'transcriptViewCopied'));
  };

  // Render the Prompt Toolbar component
  const PromptToolbar = () => {
    return (
      <div className="mb-4 bg-gray-100 p-3 rounded shadow">
        <h3 className="text-md font-bold mb-2">Prompt Tools</h3>
        <div className="flex space-x-2">
          <button
            className="px-3 py-2 rounded text-sm bg-green-100 hover:bg-green-200"
            onClick={handleShowBlogArticlePrompt}
            disabled={!selectedTopic}
          >
            Create Blog Article Prompt
          </button>
          
          <button
            className="px-3 py-2 rounded text-sm bg-purple-100 hover:bg-purple-200"
            onClick={handleShowSubtopicsPrompt}
            disabled={!selectedTopic}
          >
            Create Subtopics & Tweets Prompt
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {!selectedTopic ? 'Select a topic to enable prompt tools' : 'Click a button to view the prompt with current data'}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Prompt Modal */}
      <PromptModal />
      
      {/* Left Sidebar - Topics */}
      <div className="w-64 bg-white p-4 overflow-y-auto border-r">
        <h2 className="text-xl font-bold mb-4">Topics</h2>
        
        <div className="mb-6">
          <div className="flex flex-col space-y-2 mb-4">
            <label className="font-medium">Upload Files:</label>
            <div className="flex flex-col space-y-2">
              <label className="border rounded p-2 text-center bg-blue-500 text-white cursor-pointer hover:bg-blue-600">
                Upload Transcript
                <input type="file" className="hidden" onChange={handleTranscriptUpload} accept=".txt" />
              </label>
              <label className="border rounded p-2 text-center bg-green-500 text-white cursor-pointer hover:bg-green-600">
                Upload Topics JSON
                <input type="file" className="hidden" onChange={handleJsonUpload} accept=".json" />
              </label>
            </div>
            {/* Add Copy Prompt Button */}     
            <button 
              className={`mt-3 w-full border rounded p-2 text-center text-sm ${promptCopied ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={handleCopyPrompt}
              disabled={promptCopied}
            >
              {promptCopied ? 'Prompt Copied!' : 'Copy Prompt Text'}
            </button>
          </div>
        </div>
        
        {selectedTopic ? (
          <button 
            className="mb-4 px-3 py-1 bg-gray-200 rounded text-sm"
            onClick={() => dispatch(setSelectedTopic(null))}
          >
            ← Back to all topics
          </button>
        ) : null}
        
        <div>
          <h3 className="font-bold text-blue-600 mb-2">Specific Topics</h3>
          <ul className="mb-4">
            {specificTopics.map((topic, index) => (
              <li 
                key={`specific-${index}`}
                className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTopic && selectedTopic.name === topic.name ? 'bg-blue-100' : ''}`}
                onClick={() => handleTopicClick(topic, 'specific')}
              >
                {topic.name}
              </li>
            ))}
          </ul>
          
          <h3 className="font-bold text-green-600 mb-2">General Topics</h3>
          <ul>
            {generalTopics.map((topic, index) => (
              <li 
                key={`general-${index}`}
                className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTopic && selectedTopic.name === topic.name ? 'bg-green-100' : ''}`}
                onClick={() => handleTopicClick(topic, 'general')}
              >
                {topic.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Right Content - Transcript */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {selectedTopic && (
          <div className="mb-4 bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">{selectedTopic.name}</h2>
              {/* Add Copy Topic Info Button */} 
              <button 
                className={`px-3 py-1 text-xs rounded ${topicInfoCopied ? 'bg-blue-200' : 'bg-blue-100 hover:bg-blue-300'}`}
                onClick={handleCopyTopicInfo}
                disabled={topicInfoCopied}
              >
                {topicInfoCopied ? 'Copied!' : 'Copy Info'}
              </button>
            </div>
            <p className="mb-2">{selectedTopic.information}</p>
            <div className="mt-4">
              <h3 className="font-bold">Key Quotes:</h3>
              <ul className="list-disc pl-5">
                {selectedTopic.key_quotes.map((quote, index) => (
                  <li key={index} className="mb-2 italic">{quote}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Add Prompt Toolbar */}
        {selectedTopic && parsedTranscript.length > 0 && <PromptToolbar />}
        
        {/* Add Copy Transcript View Button */} 
        {parsedTranscript.length > 0 && (
          <div className="mb-2 text-right">
            <button 
              className={`px-3 py-1 text-xs rounded ${transcriptViewCopied ? 'bg-yellow-300' : 'bg-yellow-100 hover:bg-yellow-200'}`}
              onClick={handleCopyTranscriptView}
              disabled={transcriptViewCopied || displayedContent.length === 0}
            >
              {transcriptViewCopied ? 'Copied View!' : 'Copy Current View'}
            </button>
          </div>
        )}
        
        <div className="flex-1 bg-white p-4 rounded shadow overflow-y-auto" ref={transcriptRef}>
          {parsedTranscript.length > 0 ? (
            <div>
              {selectedTopic ? (
                <div className="mb-4">
                  <h3 className="font-bold">Time Ranges for "{selectedTopic.name}":</h3>
                  <ul className="list-disc pl-5">
                    {selectedTopic.time_ranges.map((range, index) => (
                      <li key={index}>{range.start} - {range.end}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              
              {displayedContent.map((item, index) => {
                if ('segments' in item) {
                  // Render a grouped segment block
                  const group = item as SegmentGroup;
                  return (
                    <div 
                      key={`group-${index}`} 
                      // Add data attributes for the group's time range
                      data-starttime={group.firstSegment.startTime}
                      data-endtime={group.lastSegment.endTime}
                      // Add extra margin-top if this group is not the first one, 
                      // indicating a discontinuity from the previous block.
                      className={`p-2 rounded highlight bg-yellow-100 ${index > 0 ? 'mt-6' : 'mt-3'} mb-3`} 
                    >
                      <div className="font-mono text-xs text-gray-500 mb-1">
                        {formatTime(group.firstSegment.startTime)}-{formatTime(group.lastSegment.endTime)}
                      </div>
                      {/* Render segments with timestamps based on gaps or intervals */}
                      <div style={{ whiteSpace: 'pre-line' }}>
                        {(() => {
                          let lastMarkerTime = group.firstSegment.startTime;
                          const elements: React.ReactNode[] = [];
                          let isFirstSegmentInLoop = true; // To handle edge case at the start

                          group.segments.forEach((segment, i) => {
                            let separatorInserted = false;

                            if (i > 0) {
                              const previousSegment = group.segments[i - 1];
                              // Priority 1: Check for significant gaps
                              if (isSignificantTimeGap(segment, previousSegment)) {
                                elements.push(
                                  <div 
                                    key={`gap-separator-${i}`} 
                                    // Style for significant gap marker (no border)
                                    className="text-sm font-bold text-orange-700 mt-4 mb-2 pt-2"
                                  >
                                    [{formatTime(segment.startTime)}] - Gap
                                  </div>
                                );
                                lastMarkerTime = segment.startTime;
                                separatorInserted = true;
                              }
                            }

                            // Priority 2: Check for 2-minute interval if no gap was inserted
                            if (!separatorInserted && (segment.startTime - lastMarkerTime >= 120)) {
                              // Avoid inserting at the very start if the first segment itself triggers it
                              // or immediately after a gap marker if the times align perfectly.
                              if (!isFirstSegmentInLoop || segment.startTime > group.firstSegment.startTime) {
                                // Only insert if the current segment START time is past the marker
                                // (Prevents adding marker if a previous segment ended exactly at the 2min mark)
                                elements.push(
                                  <div 
                                    key={`interval-separator-${i}`} 
                                    // Style for regular interval marker (no border)
                                    className="text-xs font-semibold text-gray-600 mt-3 mb-1 pt-1"
                                  >
                                    [{formatTime(segment.startTime)}]
                                  </div>
                                );
                                // Update marker time. Use segment start time for simplicity.
                                lastMarkerTime = segment.startTime; 
                                separatorInserted = true; // Technically true, prevents double checks
                              }
                            }

                            // Add the actual segment text
                            elements.push(<div key={`segment-text-${i}`}>{segment.text}</div>);
                            isFirstSegmentInLoop = false; // Mark as processed
                          });

                          return elements;
                        })()}
                      </div>
                    </div>
                  );
                } else {
                  // Render an individual segment (when no topic is selected)
                  const segment = item as TranscriptSegment;
                  return (
                    <div 
                      key={`segment-${index}`} 
                      // Add data attributes for the segment's time range
                      data-starttime={segment.startTime}
                      data-endtime={segment.endTime}
                      className="mb-3 p-2 rounded" // No highlight when showing all
                    >
                      <div className="font-mono text-xs text-gray-500 mb-1">
                        {formatTime(segment.startTime)}-{formatTime(segment.endTime)}
                      </div>
                      <div>{segment.text}</div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              {transcript ? 'Processing transcript...' : 'Please upload a transcript file'}
            </div>
          )}
        </div>
        
        {/* Debug Section */}
        <div className="mt-4">
           <button 
             className="text-sm text-blue-600 hover:underline"
             onClick={() => dispatch(toggleDebugInfo())}
           >
             {showDebugInfo ? 'Hide' : 'Show'} Parsed Segments Debug Info
           </button>
           {showDebugInfo && (
             <div className="mt-2 p-4 bg-gray-50 border rounded max-h-60 overflow-y-auto text-xs">
               <h4 className="font-bold mb-2">Parsed Transcript Segments ({parsedTranscript.length}):</h4>
               {parsedTranscript.map((segment, index) => (
                 <div key={`debug-${index}`} className="mb-1 p-1 border-b">
                   <p><strong>Index:</strong> {index}</p>
                   <p><strong>Time:</strong> {formatTime(segment.startTime)} ({segment.startTime}s) - {formatTime(segment.endTime)} ({segment.endTime}s)</p>
                   <p><strong>Text:</strong> {segment.text}</p>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default TranscriptAnalyzer;
