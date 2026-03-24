package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ── Core property asset ───────────────────────────────────────────────────────

type Property struct {
	DocType          string   `json:"docType"`          // "property"
	ID               string   `json:"id"`               // graph-address ID e.g. BLUE-FISH-42@8954ac27307ffff
	Lat              float64  `json:"lat"`
	Lon              float64  `json:"lon"`
	H3_9             string   `json:"h3_9"`
	H3_11            string   `json:"h3_11"`

	// Physical
	UseType          string   `json:"useType"`          // residential|commercial|mixed|religious|school|clinic|health|market|workshop|warehouse|storage|vacant|informal|other
	ConstructionType string   `json:"constructionType"` // concrete|brick|wood|iron_sheet|mixed|temporary|unknown
	Floors           int      `json:"floors"`
	ApproxAreaM2     float64  `json:"approxAreaM2"`
	ConditionScore   int      `json:"conditionScore"`   // 1(poor)–5(excellent)
	HasElectricity   bool     `json:"hasElectricity"`
	HasWater         bool     `json:"hasWater"`

	// Zoning
	ZoningClass      string   `json:"zoningClass"`      // formal_residential|informal_residential|commercial|industrial|public|religious|green|disputed
	PermittedUses    []string `json:"permittedUses"`
	MaxFloors        int      `json:"maxFloors"`
	ZonePolicyRef    string   `json:"zonePolicyRef"`    // H3-9 zone policy ID

	// Ownership
	OwnerName        string   `json:"ownerName"`
	NationalID       string   `json:"nationalId"`
	Phone            string   `json:"phone"`
	Email            string   `json:"email"`
	TenureType       string   `json:"tenureType"`       // freehold|leasehold|customary|informal_occupancy|cooperative|communal|disputed|state
	TenureDoc        string   `json:"tenureDoc"`        // document reference or IPFS hash
	TenureSince      string   `json:"tenureSince"`      // ISO date

	// Valuation
	AssessedValueCFA int64    `json:"assessedValueCFA"`
	ValuationMethod  string   `json:"valuationMethod"`  // market|income|cost|proxy
	ValuationDate    string   `json:"valuationDate"`
	ValuatorID       string   `json:"valuatorId"`
	ZoneFactor       float64  `json:"zoneFactor"`       // location multiplier
	UseMultiplier    float64  `json:"useMultiplier"`    // use-type multiplier
	AreaRateCFA      int64    `json:"areaRateCFA"`      // CFA per m2 for proxy valuation

	// Status
	Status           string   `json:"status"`           // active|demolished|disputed|exempt|pending_review
	ExemptReason     string   `json:"exemptReason"`     // mosque|school|hospital|state|other
	DataSource       string   `json:"dataSource"`       // field|satellite|imported|osm
	PhotoHash        string   `json:"photoHash"`        // IPFS hash of field photo
	Notes            string   `json:"notes"`

	// Audit
	RegisteredBy     string   `json:"registeredBy"`
	RegisteredAt     string   `json:"registeredAt"`
	UpdatedBy        string   `json:"updatedBy"`
	UpdatedAt        string   `json:"updatedAt"`
}

type Ownership struct {
	DocType      string `json:"docType"` // "ownership_transfer"
	PropertyID   string `json:"propertyId"`
	FromOwner    string `json:"fromOwner"`
	ToOwner      string `json:"toOwner"`
	ToNationalID string `json:"toNationalId"`
	TenureType   string `json:"tenureType"`
	TransferDate string `json:"transferDate"`
	TransferDoc  string `json:"transferDoc"`
	RecordedBy   string `json:"recordedBy"`
	TxID         string `json:"txId"`
}

// ── SmartContract ─────────────────────────────────────────────────────────────

type PropertyContract struct {
	contractapi.Contract
}

func (c *PropertyContract) RegisterProperty(ctx contractapi.TransactionContextInterface, id string, propertyJSON string) error {
	existing, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to read state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("property %s already registered", id)
	}

	var p Property
	if err := json.Unmarshal([]byte(propertyJSON), &p); err != nil {
		return fmt.Errorf("invalid property JSON: %v", err)
	}
	p.DocType = "property"
	p.ID = id
	p.RegisteredAt = time.Now().UTC().Format(time.RFC3339)

	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(id, data)
}

func (c *PropertyContract) UpdateProperty(ctx contractapi.TransactionContextInterface, id string, propertyJSON string) error {
	existing, err := ctx.GetStub().GetState(id)
	if err != nil || existing == nil {
		return fmt.Errorf("property %s not found", id)
	}
	var p Property
	if err := json.Unmarshal([]byte(propertyJSON), &p); err != nil {
		return fmt.Errorf("invalid property JSON: %v", err)
	}
	p.ID = id
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(id, data)
}

func (c *PropertyContract) TransferOwnership(ctx contractapi.TransactionContextInterface, propertyID, toOwner, toNationalID, tenureType, transferDoc, recordedBy string) error {
	data, err := ctx.GetStub().GetState(propertyID)
	if err != nil || data == nil {
		return fmt.Errorf("property %s not found", propertyID)
	}
	var p Property
	json.Unmarshal(data, &p)

	transfer := Ownership{
		DocType:      "ownership_transfer",
		PropertyID:   propertyID,
		FromOwner:    p.OwnerName,
		ToOwner:      toOwner,
		ToNationalID: toNationalID,
		TenureType:   tenureType,
		TransferDoc:  transferDoc,
		TransferDate: time.Now().UTC().Format(time.RFC3339),
		RecordedBy:   recordedBy,
		TxID:         ctx.GetStub().GetTxID(),
	}
	transferData, _ := json.Marshal(transfer)
	transferKey := fmt.Sprintf("transfer~%s~%s", propertyID, ctx.GetStub().GetTxID())
	ctx.GetStub().PutState(transferKey, transferData)

	p.OwnerName = toOwner
	p.NationalID = toNationalID
	p.TenureType = tenureType
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	updated, _ := json.Marshal(p)
	return ctx.GetStub().PutState(propertyID, updated)
}

func (c *PropertyContract) GetProperty(ctx contractapi.TransactionContextInterface, id string) (*Property, error) {
	data, err := ctx.GetStub().GetState(id)
	if err != nil || data == nil {
		return nil, fmt.Errorf("property %s not found", id)
	}
	var p Property
	json.Unmarshal(data, &p)
	return &p, nil
}

func (c *PropertyContract) GetPropertyHistory(ctx contractapi.TransactionContextInterface, id string) ([]map[string]interface{}, error) {
	iter, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	var history []map[string]interface{}
	for iter.HasNext() {
		mod, err := iter.Next()
		if err != nil {
			continue
		}
		entry := map[string]interface{}{
			"txId":      mod.TxId,
			"timestamp": mod.Timestamp.AsTime().Format(time.RFC3339),
			"isDelete":  mod.IsDelete,
		}
		var p Property
		if err := json.Unmarshal(mod.Value, &p); err == nil {
			entry["value"] = p
		}
		history = append(history, entry)
	}
	return history, nil
}

func (c *PropertyContract) QueryByZone(ctx contractapi.TransactionContextInterface, h3_9 string) ([]*Property, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"property","h3_9":"%s"}}`, h3_9)
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	var results []*Property
	for iter.HasNext() {
		res, err := iter.Next()
		if err != nil {
			continue
		}
		var p Property
		json.Unmarshal(res.Value, &p)
		results = append(results, &p)
	}
	return results, nil
}

func main() {
	cc, err := contractapi.NewChaincode(&PropertyContract{})
	if err != nil {
		panic(err)
	}
	if err := cc.Start(); err != nil {
		panic(err)
	}
}
