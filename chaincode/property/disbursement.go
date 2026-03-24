package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Disbursement — where collected tax revenue is spent.
// This is the public accountability layer: every CFA spent is on-chain.

type Disbursement struct {
	DocType        string `json:"docType"`        // "disbursement"
	ID             string `json:"id"`
	FiscalYear     int    `json:"fiscalYear"`
	AmountCFA      int64  `json:"amountCFA"`
	Purpose        string `json:"purpose"`        // roads|drainage|schools|health|electricity|water|waste|admin|emergency|other
	ZoneH3         string `json:"zoneH3"`         // which H3-9 zone benefits (empty = city-wide)
	Description    string `json:"description"`
	ContractRef    string `json:"contractRef"`
	ContractorID   string `json:"contractorId"`
	ContractorName string `json:"contractorName"`
	ApprovedBy     string `json:"approvedBy"`
	ApprovalDate   string `json:"approvalDate"`
	EvidenceHash   string `json:"evidenceHash"`   // IPFS hash: photos, invoices, completion report
	Status         string `json:"status"`         // approved|in_progress|completed|disputed|cancelled
	CompletedDate  string `json:"completedDate"`
	Notes          string `json:"notes"`
}

type DisbursementContract struct {
	contractapi.Contract
}

func (c *DisbursementContract) ApproveDisbursement(ctx contractapi.TransactionContextInterface, id string, disbursementJSON string) error {
	var d Disbursement
	if err := json.Unmarshal([]byte(disbursementJSON), &d); err != nil {
		return fmt.Errorf("invalid disbursement JSON: %v", err)
	}
	d.DocType = "disbursement"
	d.ID = id
	d.ApprovalDate = time.Now().UTC().Format(time.RFC3339)
	d.Status = "approved"
	data, _ := json.Marshal(d)
	return ctx.GetStub().PutState(id, data)
}

func (c *DisbursementContract) MarkComplete(ctx contractapi.TransactionContextInterface, id, evidenceHash, notes string) error {
	data, err := ctx.GetStub().GetState(id)
	if err != nil || data == nil {
		return fmt.Errorf("disbursement %s not found", id)
	}
	var d Disbursement
	json.Unmarshal(data, &d)
	d.Status = "completed"
	d.EvidenceHash = evidenceHash
	d.CompletedDate = time.Now().UTC().Format(time.RFC3339)
	d.Notes = notes
	updated, _ := json.Marshal(d)
	return ctx.GetStub().PutState(id, updated)
}

func (c *DisbursementContract) GetZoneDisbursements(ctx contractapi.TransactionContextInterface, h3_9 string, fiscalYear int) ([]*Disbursement, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"disbursement","zoneH3":"%s","fiscalYear":%d}}`, h3_9, fiscalYear)
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	var results []*Disbursement
	for iter.HasNext() {
		res, _ := iter.Next()
		var d Disbursement
		json.Unmarshal(res.Value, &d)
		results = append(results, &d)
	}
	return results, nil
}
