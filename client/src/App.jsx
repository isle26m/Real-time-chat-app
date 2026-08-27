import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

import ScrollToBottom from "react-scroll-to-bottom";

import Sent from "./assets/sent.mp3";
import New from "./assets/new.mp3";

const socket = io("http://localhost:6767", { autoConnect: false });

const emojiMap = new Map();
emojiMap.set(':)', '🙂‍');
emojiMap.set(':(', '🙁');
emojiMap.set(':D', '😀');
emojiMap.set('C:', '☺️');
emojiMap.set('X)', '😆');
emojiMap.set(':C', '☹️');

function App() {
  const coolDown = 750; // 750ms;
  const [canSend, setCanSend] = useState(true);

  const [chat, setChat] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgList, setMsgList] = useState([]);

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");

  const newRef = useRef(null);
  const sentRef = useRef(null);

  const playAudio = (ref) => {
    if (ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  };

  const joinRoom = () => {
    if (username.trim() !== "" && room.trim() !== "") {
      socket.connect();
      socket.emit("join_room", room);
      setChat(true);
    }
  };

  const sendMsg = () => {
    if (msg.trim() !== "" && canSend) {
      const finalMsg = emojiMap.get(msg) || msg;
      const date = new Date();
      const time =
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0");

      socket.emit("send_message", {
        msg: finalMsg,
        username: username,
        room: room,
        id: socket.id,
        time: time,
      });
      setMsg("");
      setCanSend(false);
      setTimeout(() => {
        setCanSend(true);
      }, coolDown);
    }
  };

  const title = "Join a chat";
  const words = title.split(" ");

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      setMsgList((list) => [...list, data]);
      if (data.id === socket.id) {
        playAudio(sentRef);
      } else {
        playAudio(newRef);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, []);

  return (
    <div className="h-dvh w-full flex justify-center items-center p-4 sm:p-6 bg-white overflow-hidden">
      <audio src={Sent} ref={sentRef}></audio>
      <audio src={New} ref={newRef}></audio>

      {!chat && (
        <div className="flex flex-col items-center justify-center gap-8 sm:gap-16 w-full max-w-2xl my-auto">
          <h1 className="text-5xl max-sm:text-4xl sm:text-7xl md:text-8xl font-bold tracking-tight text-center w-full">
            <motion.span
              className="inline-flex flex-wrap justify-center gap-x-[0.25em]"
              initial="hidden"
              animate="visible"
              style={{ willChange: "transform" }}
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {words.map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block whitespace-nowrap">
                  {word.split("").map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      className="inline-block"
                      style={{ willChange: "transform" }}
                      variants={{
                        hidden: { y: "100%", opacity: 0 },
                        visible: { y: "0%", opacity: 1 },
                      }}
                      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              ))}
            </motion.span>
          </h1>
          <div className="flex flex-col gap-4 sm:gap-8 w-full max-w-sm sm:max-w-md">
            <input
              placeholder="Username"
              type="text"
              className="border-3 outline-none p-2 placeholder:text-lg sm:placeholder:text-xl text-lg sm:text-xl px-3 h-12 w-full rounded-none text-left"
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") joinRoom();
              }}
            />
            <input
              placeholder="Room"
              type="text"
              className="border-3 outline-none p-2 placeholder:text-lg sm:placeholder:text-xl text-lg sm:text-xl px-3 h-12 w-full rounded-none text-left"
              onChange={(e) => setRoom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") joinRoom();
              }}
            />
            <button
              className="p-2 border-3 cursor-pointer text-lg sm:text-xl h-12 w-full bg-[#A9A9A9] hover:bg-[#B9B9B9] rounded-none active:scale-[0.99] transition-transform text-center"
              onClick={joinRoom}
            >
              Join
            </button>
          </div>
        </div>
      )}

      {chat && (
        <div className="h-full sm:h-[500px] w-full max-w-2xl mx-auto flex flex-col border-0 sm:border-3 rounded-none overflow-hidden shadow-none sm:shadow-sm">
          <ScrollToBottom
            checkInterval={0}
            className="flex-1 overflow-y-auto"
            scrollViewClassName="p-3 sm:p-4 flex flex-col gap-1 overflow-x-hidden"
          >
            {msgList.map((e, index) => {
              const isMe = e.id === socket.id;
              const prevMsg = msgList[index - 1];
              const nextMsg = msgList[index + 1];

              const showUsername =
                !isMe && (!prevMsg || prevMsg.username !== e.username);
              const isLastInGroup = !nextMsg || nextMsg.time !== e.time;

              return (
                <div
                  key={index}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  } ${!isLastInGroup ? "mb-1" : ""}`}
                >
                  <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-xs">
                    {showUsername && (
                      <motion.div
                        style={{
                          backfaceVisibility: "hidden",
                          willChange: "transform",
                        }}
                        initial={{ x: isMe ? "100%" : "-100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="text-xs sm:text-sm font-bold my-1 text-left"
                      >
                        {e.username}
                      </motion.div>
                    )}
                    <motion.div
                      style={{
                        backfaceVisibility: "hidden",
                        willChange: "transform",
                      }}
                      initial={{ x: isMe ? "100%" : "-100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className={`p-2.5 sm:p-2 rounded-2xl text-base sm:text-lg w-fit break-words ${
                        isMe
                          ? "bg-[#B3EBF2] rounded-tr-none"
                          : "bg-[#C0C0C0] rounded-tl-none"
                      }`}
                    >
                      {e.msg}
                    </motion.div>
                  </div>

                  {isLastInGroup && (
                    <motion.div
                      style={{
                        backfaceVisibility: "hidden",
                        willChange: "transform",
                      }}
                      initial={{ x: isMe ? "100%" : "-100%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="text-xs sm:text-sm text-[#222222] my-1"
                    >
                      At {e.time}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </ScrollToBottom>
          <div className="flex flex-shrink-0 border-t-3 bg-white p-1 sm:p-0">
            <input
              placeholder="Send a message.."
              type="text"
              className="outline-none p-2 placeholder:text-base sm:placeholder:text-xl text-base sm:text-xl px-3 h-12 w-full text-left"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMsg();
              }}
            />
            <button
              className="px-3 sm:px-4 py-2 cursor-pointer border-l-3 flex items-center justify-center active:bg-gray-100 transition-colors"
              onClick={sendMsg}
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;