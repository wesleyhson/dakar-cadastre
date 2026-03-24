# Property Data Model

## Use types
`residential` | `commercial` | `mixed` | `religious` | `school` | `health` |
`market` | `workshop` | `warehouse` | `storage` | `vacant` | `informal` | `other`

## Construction types
`concrete` | `brick` | `wood` | `iron_sheet` | `mixed` | `temporary` | `unknown`

## Tenure types
`freehold` — registered title deed
`leasehold` — fixed-term lease from state/landowner
`customary` — traditional land rights (recognised but not formally titled)
`informal_occupancy` — de facto occupation, no formal title
`cooperative` — collective/community ownership
`communal` — shared community land
`disputed` — contested ownership
`state` — government-owned, exempt

## Zone classes
`formal_residential` | `informal_residential` | `commercial` | `industrial` |
`public` | `religious` | `green` | `mixed` | `periurban` | `disputed`

## Tax exemption reasons
`mosque` | `church` | `school` | `hospital` | `state_building` |
`diplomatic` | `low_income_threshold` | `disaster_relief` | `other`

## Disbursement purposes
`roads` | `drainage` | `schools` | `health` | `electricity` | `water` |
`waste` | `markets` | `parks` | `admin` | `emergency` | `other`

## Proxy valuation formula

```
assessed_value = area_m2 x area_rate_cfa x zone_factor x use_multiplier x condition_score/3
tax_due = assessed_value x base_tax_rate_pct / 100
```

Typical values for Dakar informal settlement (estimates):
- area_rate_cfa: 15,000–80,000 CFA/m2 depending on zone
- zone_factor: 0.6 (periurban) – 2.5 (Plateau/Almadies)
- use_multiplier: 1.0 (residential) – 2.5 (commercial)
- base_tax_rate: 0.3–0.8% annually
