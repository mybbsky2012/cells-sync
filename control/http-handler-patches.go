package control

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/sync/endpoint"
)

type PatchesRequest struct {
	SyncUUID string `uri:"uuid" binding:"required"`
	Offset   int    `uri:"offset" binding:"numeric"`
	Limit    int    `uri:"limit"`
}

type PatchesResponse struct {
	Patches []merger.Patch
}

func (h *HttpServer) parsePatchRequest(c *gin.Context) (*PatchesRequest, error) {
	pR := &PatchesRequest{
		SyncUUID: c.Param("uuid"),
		Limit:    10,
	}
	if pR.SyncUUID == "" {
		return nil, fmt.Errorf("please provide a sync UUID")
	}
	if o, e := strconv.ParseInt(c.Param("offset"), 10, 64); e == nil {
		pR.Offset = int(o)
	}
	if l, e := strconv.ParseInt(c.Param("limit"), 10, 64); e == nil {
		pR.Limit = int(l)
	}
	return pR, nil
}

// reqRespStore uses a Pub/Sub model to synchronously retrieve a pointer to the PatchStore of a sync.
func (h *HttpServer) reqRespStore(syncUUID string) *endpoint.PatchStore {

	var store *endpoint.PatchStore
	wg := sync.WaitGroup{}
	wg.Add(1)
	ch := GetBus().Sub(TopicStore_ + syncUUID)
	go func() {
		defer func() {
			wg.Done()
			GetBus().Unsub(ch)
		}()
		for {
			select {
			case s := <-ch:
				store = s.(*endpoint.PatchStore)
				return
			case <-time.After(100 * time.Millisecond):
				return
			}
		}
	}()
	GetBus().Pub(MessagePublishStore, TopicSync_+syncUUID)
	wg.Wait()

	return store
}

// listPatches loads patches from store
func (h *HttpServer) listPatches(c *gin.Context) {
	request, e := h.parsePatchRequest(c)
	if e != nil {
		h.writeError(c, e)
		return
	}
	store := h.reqRespStore(request.SyncUUID)
	if store == nil {
		h.writeError(c, fmt.Errorf("cannot load store"))
		return
	}
	patches, err := store.Load(request.Offset, request.Limit)
	if err != nil {
		h.writeError(c, err)
		return
	}

	data := make(map[string]merger.Patch)
	for _, p := range patches {
		data[fmt.Sprintf("%d", p.GetStamp().Unix())] = p
	}
	c.JSON(http.StatusOK, data)

}
