package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ── Tax assessment ────────────────────────────────────────────────────────────

type TaxAssessment struct {
	DocType          string  `json:"docType"`          // "tax_assessment"
	ID               string  `json:"id"`               // "assess~{propertyId}~{year}"
	PropertyID       string  `json:"propertyId"`
	FiscalYear       int     `json:"fiscalYear"`
	AssessedValueCFA int64   `json:"assessedValueCFA"`
	RatePercent      float64 `json:"ratePercent"`
	TaxDueCFA        int64   `json:"taxDueCFA"`
	TaxPaidCFA       int64   `json:"taxPaidCFA"`
	Outstanding      int64   `json:"outstandingCFA"`
	ExemptReason     string  `json:"exemptReason"`     // empty if not exempt
	IsExempt         bool    `json:"isExempt"`
	AssessmentDate   string  `json:"assessmentDate"`
	AssessorID       string  `json:"assessorId"`
	H3_9             string  `json:"h3_9"`             // for zone-level aggregation
	Status           string  `json:"status"`           // pending|partial|paid|overdue|exempt|waived
}

// ── Tax payment ───────────────────────────────────────────────────────────────

type TaxPayment struct {
	DocType      string `json:"docType"`       // "tax_payment"
	ID           string `json:"id"`            // "pay~{receiptId}"
	AssessmentID string `json:"assessmentId"`
	PropertyID   string `json:"propertyId"`
	FiscalYear   int    `json:"fiscalYear"`
	AmountCFA    int64  `json:"amountCFA"`
	PaymentDate  string `json:"paymentDate"`
	CollectorID  string `json:"collectorId"`
	Method       string `json:"method"`        // cash|orange_money|wave|bank_transfer|cheque
	ReceiptID    string `json:"receiptId"`
	OwnerName    string `json:"ownerName"`
	H3_9         string `json:"h3_9"`
}

// ── TaxContract ───────────────────────────────────────────────────────────────

type TaxContract struct {
	contractapi.Contract
}

func (c *TaxContract) CreateAssessment(ctx contractapi.TransactionContextInterface, propertyID string, fiscalYear int, assessedValueCFA int64, ratePercent float64, assessorID string, isExempt bool, exemptReason string) error {
	id := fmt.Sprintf("assess~%s~%d", propertyID, fiscalYear)
	existing, _ := ctx.GetStub().GetState(id)
	if existing != nil {
		return fmt.Errorf("assessment for %s year %d already exists", propertyID, fiscalYear)
	}

	taxDue := int64(float64(assessedValueCFA) * ratePercent / 100.0)
	if isExempt {
		taxDue = 0
	}

	// Get H3 from property
	propData, _ := ctx.GetStub().GetState(propertyID)
	h3 := ""
	if propData != nil {
		var p Property
		json.Unmarshal(propData, &p)
		h3 = p.H3_9
	}

	a := TaxAssessment{
		DocType:          "tax_assessment",
		ID:               id,
		PropertyID:       propertyID,
		FiscalYear:       fiscalYear,
		AssessedValueCFA: assessedValueCFA,
		RatePercent:      ratePercent,
		TaxDueCFA:        taxDue,
		TaxPaidCFA:       0,
		Outstanding:      taxDue,
		IsExempt:         isExempt,
		ExemptReason:     exemptReason,
		AssessmentDate:   time.Now().UTC().Format(time.RFC3339),
		AssessorID:       assessorID,
		H3_9:             h3,
		Status: func() string {
			if isExempt {
				return "exempt"
			}
			return "pending"
		}(),
	}
	data, _ := json.Marshal(a)
	return ctx.GetStub().PutState(id, data)
}

func (c *TaxContract) RecordPayment(ctx contractapi.TransactionContextInterface, propertyID string, fiscalYear int, amountCFA int64, collectorID, method, receiptID, ownerName string) error {
	assessID := fmt.Sprintf("assess~%s~%d", propertyID, fiscalYear)
	data, err := ctx.GetStub().GetState(assessID)
	if err != nil || data == nil {
		return fmt.Errorf("assessment not found: %s year %d", propertyID, fiscalYear)
	}
	var a TaxAssessment
	json.Unmarshal(data, &a)

	a.TaxPaidCFA += amountCFA
	a.Outstanding = a.TaxDueCFA - a.TaxPaidCFA
	if a.Outstanding <= 0 {
		a.Status = "paid"
	} else {
		a.Status = "partial"
	}
	updated, _ := json.Marshal(a)
	ctx.GetStub().PutState(assessID, updated)

	payID := fmt.Sprintf("pay~%s", receiptID)
	payment := TaxPayment{
		DocType:      "tax_payment",
		ID:           payID,
		AssessmentID: assessID,
		PropertyID:   propertyID,
		FiscalYear:   fiscalYear,
		AmountCFA:    amountCFA,
		PaymentDate:  time.Now().UTC().Format(time.RFC3339),
		CollectorID:  collectorID,
		Method:       method,
		ReceiptID:    receiptID,
		OwnerName:    ownerName,
		H3_9:         a.H3_9,
	}
	payData, _ := json.Marshal(payment)
	return ctx.GetStub().PutState(payID, payData)
}

func (c *TaxContract) GetAssessment(ctx contractapi.TransactionContextInterface, propertyID string, fiscalYear int) (*TaxAssessment, error) {
	id := fmt.Sprintf("assess~%s~%d", propertyID, fiscalYear)
	data, err := ctx.GetStub().GetState(id)
	if err != nil || data == nil {
		return nil, fmt.Errorf("not found")
	}
	var a TaxAssessment
	json.Unmarshal(data, &a)
	return &a, nil
}

func (c *TaxContract) GetZoneRevenue(ctx contractapi.TransactionContextInterface, h3_9 string, fiscalYear int) (map[string]int64, error) {
	query := fmt.Sprintf(`{"selector":{"docType":"tax_payment","h3_9":"%s","fiscalYear":%d}}`, h3_9, fiscalYear)
	iter, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	var total, count int64
	for iter.HasNext() {
		res, _ := iter.Next()
		var p TaxPayment
		json.Unmarshal(res.Value, &p)
		total += p.AmountCFA
		count++
	}
	return map[string]int64{"totalCFA": total, "paymentCount": count}, nil
}
