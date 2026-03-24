package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ZonePolicy — H3-9 level zoning rules and tax rate policy

type ZonePolicy struct {
	DocType        string   `json:"docType"`        // "zone_policy"
	H3_9           string   `json:"h3_9"`
	ZoneName       string   `json:"zoneName"`       // human-readable neighbourhood name
	ZoneClass      string   `json:"zoneClass"`      // formal_residential|informal_residential|commercial|industrial|public|mixed|periurban
	BaseTaxRatePct float64  `json:"baseTaxRatePct"` // base annual rate as % of assessed value
	CommercialMult float64  `json:"commercialMult"` // multiplier for commercial use
	IndustrialMult float64  `json:"industrialMult"`
	PermittedUses  []string `json:"permittedUses"`
	MaxFloors      int      `json:"maxFloors"`
	AreaRateCFA    int64    `json:"areaRateCFA"`    // CFA per m2 for proxy valuation
	ZoneFactor     float64  `json:"zoneFactor"`     // location desirability (1.0 = baseline)
	Notes          string   `json:"notes"`
	SetBy          string   `json:"setBy"`
	EffectiveDate  string   `json:"effectiveDate"`
	UpdatedAt      string   `json:"updatedAt"`
}

type ZoneContract struct {
	contractapi.Contract
}

func (c *ZoneContract) SetZonePolicy(ctx contractapi.TransactionContextInterface, h3_9 string, policyJSON string) error {
	var zp ZonePolicy
	if err := json.Unmarshal([]byte(policyJSON), &zp); err != nil {
		return fmt.Errorf("invalid zone policy JSON: %v", err)
	}
	zp.DocType = "zone_policy"
	zp.H3_9 = h3_9
	zp.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	data, _ := json.Marshal(zp)
	return ctx.GetStub().PutState(fmt.Sprintf("zone~%s", h3_9), data)
}

func (c *ZoneContract) GetZonePolicy(ctx contractapi.TransactionContextInterface, h3_9 string) (*ZonePolicy, error) {
	data, err := ctx.GetStub().GetState(fmt.Sprintf("zone~%s", h3_9))
	if err != nil || data == nil {
		return nil, fmt.Errorf("zone policy for %s not found", h3_9)
	}
	var zp ZonePolicy
	json.Unmarshal(data, &zp)
	return &zp, nil
}
