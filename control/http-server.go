package control

import (
	"encoding/json"
	"net/http"

	"github.com/pydio/cells/common/log"
	"golang.org/x/net/context"

	"github.com/gin-gonic/gin"
	"gopkg.in/olahol/melody.v1"
)

type Message struct {
	Type    string
	Content interface{}
}

func (m *Message) Bytes() []byte {
	d, _ := json.Marshal(m)
	return d
}

func MessageFromData(d []byte) *Message {
	var m Message
	if e := json.Unmarshal(d, &m); e == nil {
		return &m
	} else {
		m.Type = "ERROR"
		m.Content = e.Error()
		return &m
	}

}

type HttpServer struct {
	Websocket *melody.Melody
	done      chan bool
}

func (h *HttpServer) InitHandlers() {

	h.Websocket = melody.New()
	h.Websocket.Config.MaxMessageSize = 2048

	h.Websocket.HandleError(func(session *melody.Session, i error) {
		session.Close()
	})

	h.Websocket.HandleClose(func(session *melody.Session, i int, i2 string) error {
		session.Close()
		return nil
	})

	h.Websocket.HandleMessage(func(session *melody.Session, bytes []byte) {

		data := MessageFromData(bytes)
		if data.Type == "PING" {
			m := &Message{Type: "PONG", Content: "Hello new client!"}
			session.Write(m.Bytes())
		} else {
			log.Logger(context.Background()).Error("Cannot read message " + data.Content.(string))
		}

	})

	go h.ListenStatus()

}

func (h *HttpServer) ListenStatus() {
	statuses := GetBus().Sub(TopicSyncAll)
	for {
		select {
		case <-h.done:
			GetBus().Unsub(statuses, TopicSyncAll)
			return
		case s := <-statuses:
			m := &Message{
				Type:    "STATUS",
				Content: s,
			}
			h.Websocket.Broadcast(m.Bytes())
		}
	}
}

func (h *HttpServer) Serve() {

	h.done = make(chan bool)
	h.InitHandlers()
	gin.SetMode(gin.ReleaseMode)
	gin.DisableConsoleColor()
	Server := gin.New()
	Server.Use(gin.Recovery())
	Server.GET("/status", func(c *gin.Context) {
		h.Websocket.HandleRequest(c.Writer, c.Request)
	})
	Server.GET("/", func(i *gin.Context) {
		i.Writer.WriteHeader(200)
		i.Writer.WriteString("Hello World!")
	})
	log.Logger(context.Background()).Info("Starting HttpServer on port 3636")
	http.ListenAndServe(":3636", Server)

}

func (h *HttpServer) Stop() {
	h.done <- true
}