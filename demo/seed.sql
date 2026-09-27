begin;

do $$
begin
  if exists (select 1 from projects where id='10000000-0000-4000-8000-000000000001') then
    return;
  end if;

  insert into projects(id,project_code,name,status) values
    ('10000000-0000-4000-8000-000000000001','AWI-DEMO','Демонстрационный строительный проект','active');

  insert into project_documents(id,project_id,filename,storage_key,mime_type,processing_status,document_kind,current_version) values
    ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Договор подряда AWI-DEMO-001.txt','demo-contract.txt','text/plain','completed','contract',1),
    ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Смета проекта.xlsx','demo-contract.txt','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','completed','estimate',1);

  insert into document_versions(id,document_id,version,storage_key,sha256,extraction_method) values
    ('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',1,'demo-contract.txt','demo-sha256','text');

  insert into evidence(id,project_id,document_id,document_version_id,page_number,quote) values
    ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001',1,'Стоимость работ: 12 500 000 рублей.'),
    ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001',1,'Срок завершения работ: 31 декабря 2026 года.'),
    ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001',1,'Оплата после подписания акта выполненных работ.');

  insert into extracted_facts(id,project_id,fact_type,value,unit,confidence,status,evidence_ids) values
    ('31000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','contract.amount','12500000'::jsonb,'RUB',0.99,'verified','["30000000-0000-4000-8000-000000000001"]'),
    ('31000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','contract.deadline','"2026-12-31"'::jsonb,null,0.96,'verified','["30000000-0000-4000-8000-000000000002"]');

  insert into work_items(id,project_id,code,name,unit,planned_quantity,evidence_ids) values
    ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','01-001','Подготовительные и монтажные работы','компл.',1,'["30000000-0000-4000-8000-000000000001"]');
  insert into estimates(id,project_id,name,estimate_type,currency,version,status) values
    ('41000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Базовая смета проекта','baseline','RUB',1,'approved');
  insert into price_evidence(id,project_id,source_type,amount,currency,price_date,source_document_id,evidence_ids,status) values
    ('42000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','contract',12500000,'RUB','2026-09-26','20000000-0000-4000-8000-000000000001','["30000000-0000-4000-8000-000000000001"]','verified');
  insert into estimate_items(id,estimate_id,work_item_id,quantity,unit,labor_amount,material_amount,equipment_amount,overhead_amount,risk_amount,vat_amount,total_amount,price_evidence_ids,evidence_ids) values
    ('43000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'компл.',3500000,5000000,1000000,500000,416666.67,2083333.33,12500000,'["42000000-0000-4000-8000-000000000001"]','["30000000-0000-4000-8000-000000000001"]');

  insert into contracts(id,project_id,document_id,contract_number,contract_date,currency,status,version) values
    ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','AWI-DEMO-001','2026-09-01','RUB','active',1);
  insert into contract_items(id,contract_id,work_item_id,code,name,quantity,unit,unit_price,amount,currency,evidence_ids) values
    ('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','01-001','Подготовительные и монтажные работы',1,'компл.',12500000,12500000,'RUB','["30000000-0000-4000-8000-000000000001"]');
  insert into obligations(id,contract_id,contract_item_id,obligated_party_id,obligation_type,description,due_at,status,evidence_ids) values
    ('52000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','contractor-demo','deadline','Завершить работы по договору','2026-12-31 18:00:00+03','planned','["30000000-0000-4000-8000-000000000002"]');

  insert into decisions(id,project_id,title,summary,gate_level,status,evidence_refs,decided_by,decided_at) values
    ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Подтвердить финансовое движение','Демонстрационное одобрение Evidence-backed операций','H3','approved','["30000000-0000-4000-8000-000000000001"]','demo-director',now());
  insert into human_gates(id,project_id,decision_id,gate_type,gate_level,status,reason,payload,decided_by,decided_at) values
    ('61000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','H3','H3','approved','Финансовое решение','{}','demo-director',now());

  insert into contract_financial_events(id,project_id,contract_id,contract_item_id,event_type,amount,currency,source_document_id,evidence_ids,human_gate_id,status,occurred_at) values
    ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','accepted',6000000,'RUB','20000000-0000-4000-8000-000000000001','["30000000-0000-4000-8000-000000000003"]',null,'verified','2026-09-20'),
    ('70000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','invoiced',5000000,'RUB','20000000-0000-4000-8000-000000000001','["30000000-0000-4000-8000-000000000003"]',null,'verified','2026-09-22'),
    ('70000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','paid',3500000,'RUB','20000000-0000-4000-8000-000000000001','["30000000-0000-4000-8000-000000000003"]',null,'verified','2026-09-25');

  insert into audit_events(id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at) values
    ('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PROJECT_CREATED','human','demo-director','90000000-0000-4000-8000-000000000001','[]','{"source":"demo-seed"}','2026-09-01'),
    ('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','DOCUMENT_ANALYZED','agent','SOL','90000000-0000-4000-8000-000000000002','["30000000-0000-4000-8000-000000000001","30000000-0000-4000-8000-000000000002"]','{"documentId":"20000000-0000-4000-8000-000000000001"}','2026-09-02'),
    ('80000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','HUMAN_GATE_APPROVED','human','demo-director','90000000-0000-4000-8000-000000000003','["30000000-0000-4000-8000-000000000001"]','{"decisionId":"60000000-0000-4000-8000-000000000001"}','2026-09-03'),
    ('80000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','PAYMENT_RECORDED','human','demo-finance','90000000-0000-4000-8000-000000000004','["30000000-0000-4000-8000-000000000003"]','{"amount":3500000,"currency":"RUB"}','2026-09-25');
end $$;

commit;
