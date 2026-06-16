
import { useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'

const RESEARCH_DB = [
  // Cycle / hormones
  { id:'PMC10173679', category:'cycle', year:2023, tags:['adhd','cycle','hormones'], title:'Fluctuations of ADHD symptoms across the menstrual cycle', titleRu:'Колебания симптомов СДВГ в зависимости от фазы цикла', summary:'Падение эстрогена в позднюю лютеиновую фазу связано с усилением симптомов СДВГ. Это важно для дневника симптомов и персональных рекомендаций.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10173679/' },
  { id:'PMC10212816', category:'cycle', year:2023, tags:['pmdd','pms','hormones'], title:'New Pharmacological Approaches to the Management of PMDD', titleRu:'Новые подходы к лечению ПМДР', summary:'Обзор новых подходов к лечению ПМДР. Полезен для логики, где тяжёлые предменструальные симптомы не считаются просто «обычным ПМС».', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10212816/' },
  { id:'PMID12423550', category:'cycle', year:2002, tags:['psst','pms','pmdd'], title:'Premenstrual Symptoms Screening Tool (PSST)', titleRu:'Опросник PSST для скрининга ПМС и ПМДР', summary:'Валидированный инструмент для различения обычного ПМС и клинически значимого ПМДР.', url:'https://pubmed.ncbi.nlm.nih.gov/12423550/' },
  { id:'PMID22295606', category:'cycle', year:2012, tags:['phases','ovulation','physiology'], title:'The normal menstrual cycle and the control of ovulation', titleRu:'Нормальный менструальный цикл и контроль овуляции', summary:'Базовый обзор физиологии цикла. Даёт основу для расчёта овуляции, фолликулярной и лютеиновой фаз.', url:'https://pubmed.ncbi.nlm.nih.gov/22295606/' },
  { id:'PMID37580717', category:'cycle', year:2023, tags:['pcos','guideline','endocrinology'], title:'International Evidence-based Guideline for PCOS', titleRu:'Международный гайдлайн по СПКЯ', summary:'Самый актуальный международный консенсус по диагностике и ведению СПКЯ. Важен для флагов нерегулярности цикла, метаболических рисков и фертильности.', url:'https://pubmed.ncbi.nlm.nih.gov/37580717/' },
  { id:'PMID35506915', category:'cycle', year:2022, tags:['pcos','metabolism','insulin'], title:'Metabolic features and insulin resistance in PCOS', titleRu:'Метаболические особенности и инсулинорезистентность при СПКЯ', summary:'Полезно для логики анализов и маркеров риска: HbA1c, триглицериды, HOMA-IR.', url:'https://pubmed.ncbi.nlm.nih.gov/35506915/' },

  // Brain / mental health
  { id:'PMC8328972', category:'brain', year:2021, tags:['adhd','consensus','neurodiversity'], title:'World Federation of ADHD International Consensus Statement', titleRu:'Международный консенсус по СДВГ', summary:'Один из ключевых документов по СДВГ у взрослых. Подходит как базовая база знаний для AI-триажа и подсказок.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8328972/' },
  { id:'PMC4049026', category:'brain', year:2014, tags:['adhd','bpd','differential'], title:'Borderline Personality Disorder and ADHD: Distinct or Overlapping Disorders?', titleRu:'СДВГ и ПРЛ: различия и пересечения', summary:'Помогает AI различать импульсивность при СДВГ и эмоциональную нестабильность при ПРЛ.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4049026/' },
  { id:'PMID14663148', category:'brain', year:2003, tags:['bpd','msi-bpd','screening'], title:'The McLean Screening Instrument for Borderline Personality Disorder', titleRu:'MSI-BPD: скрининг пограничного расстройства личности', summary:'Короткий и популярный скрининг на ПРЛ, удобный для чатового формата.', url:'https://pubmed.ncbi.nlm.nih.gov/14663148/' },
  { id:'PMID11115186', category:'brain', year:2000, tags:['bipolar','mdq','screening'], title:'Development and validation of the Mood Disorder Questionnaire', titleRu:'MDQ: скрининг биполярного спектра', summary:'Золотой стандарт быстрого скрининга гипомании и биполярного спектра.', url:'https://pubmed.ncbi.nlm.nih.gov/11115186/' },
  { id:'PMID11439754', category:'brain', year:2001, tags:['autism','aq','screening'], title:'The Autism-Spectrum Quotient (AQ)', titleRu:'AQ: шкала аутистических черт у взрослых', summary:'Оригинальная статья по Autism-Spectrum Quotient. Используется только как скрининг аутистических черт, не как диагноз.', url:'https://pubmed.ncbi.nlm.nih.gov/11439754/' },
  { id:'PMID15841682', category:'brain', year:2005, tags:['adhd','asrs','screening'], title:'The Adult ADHD Self-Report Scale (ASRS v1.1)', titleRu:'ASRS v1.1: скрининг СДВГ у взрослых', summary:'Стандартизированный короткий тест ВОЗ для экспресс-скрининга СДВГ.', url:'https://pubmed.ncbi.nlm.nih.gov/15841682/' },
  { id:'PMID29477251', category:'brain', year:2018, tags:['depression','antidepressants','meta-analysis'], title:'Comparative efficacy and acceptability of 21 antidepressant drugs', titleRu:'Сравнение 21 антидепрессанта - метаанализ The Lancet', summary:'Один из самых сильных метаанализов по лечению депрессии. Полезен как база для осторожных AI-комментариев о препаратах.', url:'https://pubmed.ncbi.nlm.nih.gov/29477251/' },

  // Medications
  { id:'PMC4472321', category:'medications', year:2015, tags:['nsaid','ovulation','pain'], title:'Effects of over-the-counter analgesic use on reproductive hormones and ovulation', titleRu:'НПВС и овуляция - исследование BioCycle', summary:'НПВС могут влиять на овуляцию через подавление простагландинов. Важно для подсказок о боли и фертильности.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4472321/' },
  { id:'PMID25883839', category:'medications', year:2015, tags:['nsaid','infertility','ovulation'], title:'Nonsteroidal anti-inflammatory drugs and reversible female infertility', titleRu:'НПВС и обратимое женское бесплодие', summary:'Показывает, что влияние НПВС на овуляцию может быть клинически значимым, но обратимым.', url:'https://pubmed.ncbi.nlm.nih.gov/25883839/' },
  { id:'PMC12718095', category:'medications', year:2025, tags:['ssri','cycle','reproductive'], title:'Unraveling the Cycle: Impact of Antidepressants on the Female Reproductive Cycle', titleRu:'Влияние антидепрессантов на менструальный цикл', summary:'Свежий обзор влияния антидепрессантов на цикл, овуляцию и фертильность.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12718095/' },
  { id:'PMC6118267', category:'medications', year:2018, tags:['psychotropic','cycle','mental-health'], title:'Mental health, psychotropic medication use, and menstrual cycle characteristics', titleRu:'Психотропные препараты и характеристики цикла', summary:'Помогает разделять влияние психического состояния и лекарств на регулярность цикла.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6118267/' },
  { id:'PMID20112678', category:'medications', year:2010, tags:['antibiotics','candidiasis','microbiome'], title:'Antibiotic use and the risk of vulvovaginal candidiasis', titleRu:'Антибиотики и риск кандидоза', summary:'Поддерживает подсказки про вагинальный дисбиоз и молочницу после антибиотиков.', url:'https://pubmed.ncbi.nlm.nih.gov/20112678/' },
  { id:'PMID16483981', category:'medications', year:2006, tags:['emergency-contraception','bleeding'], title:'Effect of levonorgestrel emergency contraception on menstrual bleeding patterns', titleRu:'Экстренная контрацепция и паттерн кровотечений', summary:'После левоноргестрела месячные могут смещаться на несколько дней. Это важно для объяснений в календаре.', url:'https://pubmed.ncbi.nlm.nih.gov/16483981/' },

  // Diseases / gyne
  { id:'PMID32446709', category:'diseases', year:2020, tags:['endometriosis','diagnostic-delay'], title:'Diagnostic delay in endometriosis', titleRu:'Задержка диагностики эндометриоза', summary:'Показывает, насколько часто эндометриоз остаётся нераспознанным годами. Важно для флагов хронической боли.', url:'https://pubmed.ncbi.nlm.nih.gov/32446709/' },
  { id:'PMID40923654', category:'diseases', year:2024, tags:['endometriosis','ca125','meta-analysis'], title:'Diagnostic accuracy of combination of CA125 for endometriosis', titleRu:'Точность CA-125 в диагностике эндометриоза', summary:'Свежий сетевой метаанализ по диагностической ценности CA-125 и сочетаний с другими маркерами.', url:'https://pubmed.ncbi.nlm.nih.gov/40923654/' },
  { id:'PMC6419978', category:'diseases', year:2019, tags:['adenomyosis','bleeding','pain'], title:'Adenomyosis: A Clinical Review', titleRu:'Аденомиоз - клинический обзор', summary:'Полезен для AI-подсказок при длительных, обильных и болезненных месячных.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6419978/' },
  { id:'PMC4044302', category:'diseases', year:2014, tags:['thyroid','cycle','amenorrhea'], title:'Thyroid disorders and menstrual cycle abnormalities', titleRu:'Щитовидная железа и нарушения цикла', summary:'Подтверждает связь гипотиреоза, гиперпролактинемии и ановуляции.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4044302/' },
  { id:'PMID37538012', category:'diseases', year:2023, tags:['dysmenorrhea','pain','guideline'], title:'Primary and Secondary Dysmenorrhea: Diagnosis and Management', titleRu:'Первичная и вторичная дисменорея: диагностика и лечение', summary:'Обновлённый обзор по отличию «обычной» боли от признаков патологии.', url:'https://pubmed.ncbi.nlm.nih.gov/37538012/' },

  // Intimacy / contraception / LGBT+
  { id:'PMID24922573', category:'intimate', year:2014, tags:['wwm','bv','microbiome','lgbtq'], title:'Bacterial vaginosis and shared microbiota among women who have sex with women', titleRu:'Бактериальный вагиноз и обмен микробиомом в женских парах', summary:'Важная база для парных подсказок по интимной гигиене и лечению в стабильных Ж+Ж парах.', url:'https://pubmed.ncbi.nlm.nih.gov/24922573/' },
  { id:'PMC5466959', category:'intimate', year:2017, tags:['minority-stress','lgbtq','mental-health'], title:'Minority stress and mental health in sexual and gender minorities', titleRu:'Модель minority stress и психическое здоровье ЛГБТК+ людей', summary:'Помогает AI учитывать влияние стигмы и хронического стресса на самочувствие.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5466959/' },
  { id:'PMC8423402', category:'intimate', year:2021, tags:['msm','screening','hpv'], title:'Screening considerations for anal cancer risk in MSM', titleRu:'Скрининг аноректальной зоны у М+М пар', summary:'Полезная база для осторожных рекомендаций по чекапам и ВПЧ-ассоциированным рискам.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8423402/' },
  { id:'PMID12798835', category:'intimate', year:2003, tags:['iud','bleeding','contraception'], title:'Bleeding patterns with the levonorgestrel IUS vs copper IUD', titleRu:'Мирена и медная спираль: паттерны кровотечений', summary:'Помогает объяснять, почему медная спираль усиливает кровотечение, а гормональная может давать мажущие выделения.', url:'https://pubmed.ncbi.nlm.nih.gov/12798835/' },
  { id:'PMID22642226', category:'intimate', year:2012, tags:['coc','libido','contraception'], title:'Oral Contraceptive Use and Sexual Desire: A Systematic Review', titleRu:'КОК и снижение либидо - систематический обзор', summary:'Поддерживает блок подсказок о сексуальном желании и влиянии гормональной контрацепции.', url:'https://pubmed.ncbi.nlm.nih.gov/22642226/' },
  { id:'PMID29323087', category:'intimate', year:2018, tags:['masturbation','stress','body-image'], title:'Masturbation and sexual health: normative behaviors', titleRu:'Мастурбация и сексуальное здоровье', summary:'Подтверждает, что мастурбация - нормальная часть сексуального развития и не требует пугающих предупреждений.', url:'https://pubmed.ncbi.nlm.nih.gov/29323087/' },

  // Pregnancy / postpartum
  { id:'PMC12986349', category:'pregnancy', year:2025, tags:['preeclampsia','sflt1','plgf'], title:'sFlt-1/PlGF Ratio as a Central Biomarker for Preeclampsia', titleRu:'sFlt-1/PlGF как ключевой биомаркер преэклампсии', summary:'Свежая база для интерпретации анализов и предупреждений о риске преэклампсии.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12986349/' },
  { id:'PMID18463375', category:'pregnancy', year:2008, tags:['gestational-diabetes','glucose','hapo'], title:'Hyperglycemia and Adverse Pregnancy Outcomes (HAPO)', titleRu:'HAPO: гипергликемия и неблагоприятные исходы беременности', summary:'Обосновывает важность ГТТ и контроля сахара во втором триместре.', url:'https://pubmed.ncbi.nlm.nih.gov/18463375/' },
  { id:'PMC4284164', category:'pregnancy', year:2015, tags:['rhesus','anti-d'], title:'Anti-D administration in pregnancy for preventing Rhesus alloimmunisation', titleRu:'Антирезусный иммуноглобулин при беременности', summary:'Кокрейновская база для подсказок о Rh-статусе и профилактике аллоиммунизации.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4284164/' },
  { id:'PMC10185194', category:'pregnancy', year:2023, tags:['vitamin-d','supplementation'], title:'Vitamin D supplementation for women during pregnancy', titleRu:'Витамин D при беременности', summary:'Основа для мягких рекомендаций по витамину D, особенно при дефиците.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10185194/' },
  { id:'PMID1679054', category:'pregnancy', year:1991, tags:['folic-acid','neural-tube'], title:'Prevention of neural tube defects: Medical Research Council Vitamin Study', titleRu:'Фолиевая кислота и профилактика дефектов нервной трубки', summary:'Классическая работа, на которой держатся рекомендации о приёме фолиевой кислоты.', url:'https://pubmed.ncbi.nlm.nih.gov/1679054/' },
  { id:'PMC4318721', category:'postpartum', year:2015, tags:['postpartum','depression','hormones'], title:'Hormones and postpartum depression', titleRu:'Гормоны и послеродовая депрессия', summary:'Полезно для дневника самочувствия после родов и мягких рекомендаций по обращению за помощью.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4318721/' },
  { id:'PMC8143242', category:'postpartum', year:2021, tags:['breastfeeding','ssri','lactation'], title:'Antidepressant Use During Breastfeeding', titleRu:'Антидепрессанты при грудном вскармливании', summary:'Помогает делать аккуратные заметки про лактацию и психическое здоровье после родов.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8143242/' },

  // Menopause / aging
  { id:'PMC3611897', category:'menopause', year:2012, tags:['straw+10','menopause','staging'], title:'Staging reproductive aging: STRAW+10', titleRu:'STRAW+10 - стандарт оценки репродуктивного старения', summary:'Ключевая система стадирования менопаузального перехода и перименопаузы.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3611897/' },
  { id:'PMID15174246', category:'menopause', year:2004, tags:['mrs','menopause','screening'], title:'The Menopause Rating Scale (MRS)', titleRu:'Menopause Rating Scale (MRS)', summary:'Международная шкала для оценки тяжести симптомов менопаузы.', url:'https://pubmed.ncbi.nlm.nih.gov/15174246/' },
  { id:'PMC7475284', category:'menopause', year:2020, tags:['mht','hormone-therapy'], title:'Menopausal hormone therapy: safety and effectiveness', titleRu:'Менопаузальная гормональная терапия: безопасность и эффективность', summary:'Основа для нейтральных AI-пояснений о плюсах, минусах и рисках МГТ.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7475284/' },
  { id:'PMC5466949', category:'health', year:2017, tags:['sarcopenia','aging','protein','exercise'], title:'Resistance training and nutrition for sarcopenia prevention', titleRu:'Силовые тренировки и питание для профилактики саркопении', summary:'Полезно для рекомендаций людям 60+ по силовым нагрузкам и белку.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5466949/' },
  { id:'PMID32730807', category:'health', year:2020, tags:['dementia','lancet','prevention'], title:'Dementia prevention, intervention, and care - Lancet Commission', titleRu:'Профилактика деменции - комиссия The Lancet', summary:'Поддерживает важность сна, активности, социальной жизни и когнитивной нагрузки.', url:'https://pubmed.ncbi.nlm.nih.gov/32730807/' },
  { id:'PMID33984267', category:'health', year:2021, tags:['cardiovascular','women','lancet'], title:'Cardiovascular Disease in Women: a Lancet Commission', titleRu:'Сердечно-сосудистые риски у женщин - комиссия The Lancet', summary:'Важная база по атипичным симптомам сердечно-сосудистых событий у женщин.', url:'https://pubmed.ncbi.nlm.nih.gov/33984267/' },

  // Male / trans
  { id:'PMC3522336', category:'male', year:2011, tags:['sleep','testosterone','male-health'], title:'Effect of 1 week of sleep restriction on testosterone levels in young healthy men', titleRu:'Сон и тестостерон у мужчин', summary:'Даже неделя сильного недосыпа снижает дневной уровень тестостерона. Полезно для рекомендаций по восстановлению.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3522336/' },
  { id:'PMC8107974', category:'male', year:2021, tags:['androgen','depression','testosterone'], title:'Low testosterone and depressive symptoms in men', titleRu:'Дефицит андрогенов и депрессивные симптомы у мужчин', summary:'Поддерживает идею, что низкое настроение у мужчин иногда требует не только психиатрической, но и эндокринной оценки.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8107974/' },
  { id:'PMC4667232', category:'male', year:2015, tags:['fertility','spermatogenesis','heat'], title:'Effects of lifestyle and heat exposure on semen quality', titleRu:'Сперматогенез и внешние триггеры', summary:'Перегрев, стресс и образ жизни заметно влияют на мужскую фертильность.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4667232/' },
  { id:'PMID10478766', category:'male', year:1999, tags:['nih-cpsi','prostatitis','pelvic-pain'], title:'The NIH Chronic Prostatitis Symptom Index', titleRu:'NIH-CPSI: шкала хронического простатита и тазовой боли', summary:'Стандартная шкала для оценки мужской тазовой боли и симптомов мочеиспускания.', url:'https://pubmed.ncbi.nlm.nih.gov/10478766/' },
  { id:'PMC10444622', category:'trans', year:2023, tags:['gaht','metabolism','cardiovascular'], title:'Gender-affirming hormone therapy and cardiometabolic health', titleRu:'Гендерно-утверждающая терапия и кардиометаболическое здоровье', summary:'Долгосрочная база по влиянию ГАТ на липиды, состав тела и сердечно-сосудистые риски.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10444622/' },
  { id:'PMC12962056', category:'trans', year:2025, tags:['gaht','mental-health','meta-analysis'], title:'Mental health outcomes after gender-affirming hormone therapy', titleRu:'Психическое здоровье после начала ГАТ', summary:'Свежий метаанализ: корректная ГАТ ассоциирована со снижением тревоги и депрессивных симптомов.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12962056/' },

  // General health
  { id:'PMID31652431', category:'health', year:2019, tags:['gut-brain','microbiome','mental-health'], title:'The Gut-Brain Axis: Microbiota and Mental Health', titleRu:'Ось «кишечник-мозг»: микробиом и психическое здоровье', summary:'Фундаментальный обзор связи микробиома, тревоги и депрессии.', url:'https://pubmed.ncbi.nlm.nih.gov/31652431/' },
  { id:'PMID29630606', category:'health', year:2018, tags:['ibs','fodmap','diet'], title:'Efficacy of dietary and drug interventions for irritable bowel syndrome', titleRu:'Эффективность диеты FODMAP при СРК', summary:'Крупный метаанализ по синдрому раздражённого кишечника и роли питания.', url:'https://pubmed.ncbi.nlm.nih.gov/29630606/' },
  { id:'PMID34384543', category:'health', year:2021, tags:['eating-disorders','prevalence'], title:'Global prevalence of eating disorders', titleRu:'Глобальная распространённость расстройств пищевого поведения', summary:'Сильная база для разделов о пищевом поведении и раннем скрининге.', url:'https://pubmed.ncbi.nlm.nih.gov/34384543/' },
  { id:'PMID31806905', category:'health', year:2019, tags:['inflammation','aging','chronic-disease'], title:'Chronic inflammation in diseases of aging', titleRu:'Хроническое воспаление как двигатель болезней', summary:'Помогает связывать длительную усталость, метаболические риски и хроническое воспаление.', url:'https://pubmed.ncbi.nlm.nih.gov/31806905/' },

  // Teens
  { id:'PMID18312005', category:'teen', year:2008, tags:['teens','sex-ed','education'], title:'Comprehensive sexuality education and its effectiveness', titleRu:'Эффективность комплексного полового просвещения', summary:'Показывает, что грамотное просвещение не ускоряет сексуальный дебют, а делает поведение безопаснее.', url:'https://pubmed.ncbi.nlm.nih.gov/18312005/' },
  { id:'PMID26620986', category:'teen', year:2015, tags:['teens','sti','cdc'], title:'STI epidemiology among adolescents and young adults', titleRu:'ИППП среди подростков и молодых взрослых', summary:'Подтверждает высокую уязвимость группы 15-24 лет по ИППП.', url:'https://pubmed.ncbi.nlm.nih.gov/26620986/' },
  { id:'PMID25344109', category:'teen', year:2014, tags:['teens','contraception','aap'], title:'Contraception for adolescents - AAP Clinical Report', titleRu:'Контрацепция для подростков - клинический отчёт AAP', summary:'Основа для подросткового режима и образовательных карточек по контрацепции.', url:'https://pubmed.ncbi.nlm.nih.gov/25344109/' },



  // Vaccines / HPV / immunization
  { id:'PMID35853188', category:'vaccines', year:2022, tags:['hpv','adult-vaccination','future-iii'], title:'Effectiveness, immunogenicity, and safety of quadrivalent HPV vaccine in women and men aged 27-45 years', titleRu:'FUTURE III: ВПЧ-вакцинация у взрослых 27-45 лет', summary:'Долгосрочное наблюдение до 10 лет показало устойчивую иммуногенность, эффективность и безопасность вакцинации против ВПЧ у взрослых 27-45 лет.', url:'https://pubmed.ncbi.nlm.nih.gov/35853188/' },
  { id:'PMC9481115', category:'vaccines', year:2022, tags:['hpv','future-iii','full-text'], title:'Long-term follow-up of quadrivalent HPV vaccine in adults 27-45 years', titleRu:'FUTURE III full text: длительная защита у взрослых 27-45', summary:'Полный текст исследования: вакцина была хорошо переносимой, иммуногенной и сохраняла защитный эффект в группе взрослых 27-45.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9481115/' },
  { id:'PMID38314927', category:'vaccines', year:2024, tags:['hpv','hsil','adult-women'], title:'Effectiveness of prophylactic HPV vaccines against cervical HSIL in Japan', titleRu:'J-HERS 2021: ВПЧ-вакцинация и снижение HSIL', summary:'Реальные данные J-HERS 2021 показали снижение риска тяжёлых предраковых поражений шейки матки у вакцинированных женщин.', url:'https://pubmed.ncbi.nlm.nih.gov/38314927/' },
  { id:'PMID32822454', category:'vaccines', year:2020, tags:['hpv','adults','shared-decision'], title:'HPV vaccination for adults aged 27 to 45 years: updated evidence and recommendations', titleRu:'ВПЧ-вакцинация 27-45: catch-up и shared clinical decision-making', summary:'Основа для осторожной рекомендации обсудить ВПЧ-вакцинацию во взрослом возрасте: даже после сексуального дебюта защита от ещё не встреченных типов может быть полезной.', url:'https://pubmed.ncbi.nlm.nih.gov/32822454/' },
  { id:'PMID36137353', category:'vaccines', year:2022, tags:['hpv','one-dose','who'], title:'Single-dose HPV vaccination evidence', titleRu:'Данные по одной дозе ВПЧ-вакцины', summary:'Исследования по упрощённым схемам ВПЧ-вакцинации: полезны для подростковых и глобальных программ, но индивидуальный график всё равно зависит от страны и врача.', url:'https://pubmed.ncbi.nlm.nih.gov/36137353/' },
  { id:'PMID34736191', category:'vaccines', year:2021, tags:['hpv','cervical-cancer','lancet'], title:'HPV vaccination and cervical cancer reduction in England', titleRu:'ВПЧ-вакцинация и снижение рака шейки матки', summary:'Большое исследование в Англии показало резкое снижение риска рака шейки матки при вакцинации в подростковом возрасте.', url:'https://pubmed.ncbi.nlm.nih.gov/34736191/' },

  // Added PubMed / PMC-only checks and newer validation layers
  { id:'PMID28384801', category:'brain', year:2017, tags:['adhd','asrs','dsm5'], title:'The World Health Organization Adult ADHD Self-Report Scale for DSM-5', titleRu:'ASRS для DSM-5: обновлённый короткий скрининг СДВГ', summary:'Более новая версия короткого скрининга СДВГ, полезная как второй слой после ASRS v1.1.', url:'https://pubmed.ncbi.nlm.nih.gov/28384801/' },
  { id:'PMID11439754', category:'brain', year:2001, tags:['autism','aq','screening'], title:'The Autism-Spectrum Quotient (AQ)', titleRu:'Autism-Spectrum Quotient: оригинальная шкала AQ', summary:'Корректный PMID для оригинального AQ. Используется для оценки аутистических черт, но не как самостоятельный диагноз.', url:'https://pubmed.ncbi.nlm.nih.gov/11439754/' },
  { id:'PMC4396128', category:'brain', year:2015, tags:['autism','aq','traits'], title:'Measuring autistic traits in the general population', titleRu:'Измерение аутистических черт в общей популяции', summary:'Полезно для осторожной интерпретации AQ: шкала показывает черты, а не «ставит РАС».', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4396128/' },
  { id:'PMID10782451', category:'intimate', year:2000, tags:['fsfi','sexual-function','validation'], title:'The Female Sexual Function Index (FSFI)', titleRu:'FSFI: оригинальная шкала женской сексуальной функции', summary:'Корректный PubMed-источник для FSFI. Оценивает желание, возбуждение, смазку, оргазм, удовлетворённость и боль.', url:'https://pubmed.ncbi.nlm.nih.gov/10782451/' },
  { id:'PMID15841702', category:'intimate', year:2005, tags:['fsfi','validation','sexual-function'], title:'The Female Sexual Function Index: cross-validation', titleRu:'FSFI: кросс-валидация шкалы', summary:'Поддерживает использование FSFI как многомерной шкалы, а не одного «балла про либидо».', url:'https://pubmed.ncbi.nlm.nih.gov/15841702/' },
  { id:'PMID9187685', category:'intimate', year:1997, tags:['iief','sexual-function','validation'], title:'The International Index of Erectile Function (IIEF)', titleRu:'IIEF: международный индекс эректильной функции', summary:'Оригинальная полная шкала IIEF для оценки нескольких доменов сексуальной функции.', url:'https://pubmed.ncbi.nlm.nih.gov/9187685/' },
  { id:'PMID10637462', category:'intimate', year:1999, tags:['iief5','erectile-function','validation'], title:'Development and evaluation of the IIEF-5', titleRu:'IIEF-5: короткая шкала эректильной функции', summary:'Корректный PMID для IIEF-5. Удобна для скрининга, но требует медицинского контекста.', url:'https://pubmed.ncbi.nlm.nih.gov/10637462/' },
  { id:'PMID9080920', category:'brain', year:1996, tags:['bdi','depression','screening'], title:'Psychometric properties of the Beck Depression Inventory-II', titleRu:'BDI-II: психометрические свойства шкалы депрессии', summary:'Источник для BDI-II, если приложение использует расширенную шкалу депрессивной симптоматики.', url:'https://pubmed.ncbi.nlm.nih.gov/9080920/' },
  { id:'PMID17003219', category:'brain', year:2006, tags:['who5','wellbeing','screening'], title:'The WHO-5 Well-Being Index: a systematic review', titleRu:'WHO-5: систематический обзор шкалы благополучия', summary:'Полезен для мягкого трекинга благополучия без превращения каждой просадки в диагноз.', url:'https://pubmed.ncbi.nlm.nih.gov/17003219/' },
  { id:'PMID1798888', category:'health', year:1991, tags:['ess','sleepiness','sleep'], title:'A new method for measuring daytime sleepiness: the Epworth Sleepiness Scale', titleRu:'ESS: шкала дневной сонливости', summary:'Основа для скрининга дневной сонливости и флагов к сомнологу.', url:'https://pubmed.ncbi.nlm.nih.gov/1798888/' },

  // Nutrition / weight management
  { id:'PMID25182101', category:'nutrition', year:2014, tags:['nutrition','weight-loss','diet','meta-analysis','adherence'], title:'Comparison of weight loss among named diet programs in overweight and obese adults: a meta-analysis', titleRu:'Сравнение популярных диет для снижения веса - метаанализ JAMA', summary:'Разные популярные диеты дают близкие результаты, если человек может их соблюдать. В Elara это основа принципа: не одна “идеальная” диета, а реалистичный режим под пользователя.', url:'https://pubmed.ncbi.nlm.nih.gov/25182101/' },
  { id:'PMID19246357', category:'nutrition', year:2009, tags:['nutrition','weight-loss','macronutrients','rct','calorie-deficit'], title:'Comparison of Weight-Loss Diets with Different Compositions of Fat, Protein, and Carbohydrates', titleRu:'Диеты с разным соотношением жиров, белков и углеводов - РКИ NEJM', summary:'Сниженная калорийность приводила к клинически значимому снижению веса независимо от акцента на жиры, белки или углеводы. В Elara это поддерживает гибкую настройку БЖУ без фанатизма.', url:'https://pubmed.ncbi.nlm.nih.gov/19246357/' },
  { id:'PMID31443231', category:'nutrition', year:2019, tags:['nutrition','weight-maintenance','protein','meta-analysis'], title:'Dietary Strategies for Weight Loss Maintenance', titleRu:'Стратегии питания для удержания веса', summary:'Систематический обзор и метаанализ по удержанию веса. Повышенная доля белка выделяется как практичная стратегия против повторного набора веса.', url:'https://pubmed.ncbi.nlm.nih.gov/31443231/' },
  { id:'PMID41599940', category:'nutrition', year:2026, tags:['nutrition','weight-maintenance','dietary-patterns','vegetables','fruit'], title:'Dietary Patterns During Weight Loss Maintenance vs. Weight Regain', titleRu:'Паттерны питания при удержании веса и повторном наборе', summary:'Успешное удержание веса связано с более здоровым паттерном питания: больше овощей, фруктов и цельных продуктов, меньше возврата к ультра-обработанной еде.', url:'https://pubmed.ncbi.nlm.nih.gov/41599940/' },
  { id:'PMID41200142', category:'nutrition', year:2025, tags:['nutrition','metabolic-syndrome','vegan','keto','mediterranean','network-meta-analysis'], title:'Network meta-analysis of the effects of different dietary patterns on patients with Metabolic Syndrome', titleRu:'Сетевой метаанализ диетических паттернов при метаболическом синдроме', summary:'Веганский паттерн лучше ранжировался для талии, кетогенный - для давления и триглицеридов, средиземноморский - для глюкозы натощак. В Elara это используется только для осторожной персонализации, не для назначения лечения.', url:'https://pubmed.ncbi.nlm.nih.gov/41200142/' },
  { id:'PMC12585985', category:'nutrition', year:2025, tags:['nutrition','metabolic-syndrome','full-text','dietary-patterns'], title:'Full text: dietary patterns and metabolic syndrome', titleRu:'Полный текст: диетические паттерны и метаболический синдром', summary:'Полнотекстовая версия сетевого метаанализа по диетическим паттернам при метаболическом синдроме.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12585985/' },

  // First aid / home safety
  { id:'PMID33098920', category:'first_aid', year:2020, tags:['first-aid','ilcor','emergency'], title:'2020 International Consensus on First Aid Science With Treatment Recommendations', titleRu:'ILCOR 2020: международный консенсус по первой помощи', summary:'Ключевая база для первой помощи: что делать до прибытия медиков и где важны простые алгоритмы для непрофессионалов.', url:'https://pubmed.ncbi.nlm.nih.gov/33098920/' },
  { id:'PMC5127419', category:'first_aid', year:2016, tags:['aed','defibrillation','cpr'], title:'Public access defibrillation: improving accessibility and outcomes', titleRu:'Общественный доступ к AED/дефибрилляторам', summary:'Обзор показывает пользу AED и обучения непрофессионалов: ранняя дефибрилляция повышает шансы выживания при остановке сердца.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5127419/' },
  { id:'PMID28687709', category:'first_aid', year:2017, tags:['aed','survival','cardiac-arrest'], title:'The Effects of Public Access Defibrillation on Survival After Out-of-Hospital Cardiac Arrest', titleRu:'AED и выживаемость после внебольничной остановки сердца', summary:'Систематический обзор по выживаемости при использовании AED непрофессиональными и профессиональными первыми responder-ами.', url:'https://pubmed.ncbi.nlm.nih.gov/28687709/' },
  { id:'PMID28193791', category:'first_aid', year:2017, tags:['anaphylaxis','epinephrine','allergy'], title:'Epinephrine for First-aid Management of Anaphylaxis', titleRu:'Адреналин как первая помощь при анафилаксии', summary:'Поддерживает логику: при анафилаксии адреналин/эпинефрин должен использоваться быстро, антигистаминные не заменяют его.', url:'https://pubmed.ncbi.nlm.nih.gov/28193791/' },
  { id:'PMID35688782', category:'first_aid', year:2022, tags:['burns','cool-running-water','first-aid'], title:'The effect of 20 minutes of cool running water first aid within three hours of thermal burn injury', titleRu:'20 минут прохладной воды при ожогах', summary:'Данные поддерживают охлаждение термического ожога прохладной проточной водой около 20 минут в первые часы после травмы.', url:'https://pubmed.ncbi.nlm.nih.gov/35688782/' },
  { id:'PMID38982457', category:'first_aid_kit', year:2024, tags:['first-aid-kit','home','preparedness'], title:'A cross-sectional survey of first-aid kit equipment in a family in Sichuan Province', titleRu:'Домашние аптечки и готовность к первой помощи', summary:'Исследование домашней готовности: наличие аптечки связано с навыками, грамотностью и поведением в экстренных ситуациях.', url:'https://pubmed.ncbi.nlm.nih.gov/38982457/' },
  { id:'PMC9742271', category:'first_aid_kit', year:2022, tags:['first-aid-kit','emergency-preparedness','home'], title:'The current status and factors related to the preparation of home first aid kits', titleRu:'Факторы готовности домашней аптечки', summary:'Поддерживает идею чек-листа, регулярной ревизии и привязки аптечки к реальным рискам семьи.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9742271/' },
  { id:'PMC11574791', category:'first_aid_kit', year:2024, tags:['medication-safety','home-care','errors'], title:'Enhancing safe medication use in home care', titleRu:'Безопасное использование лекарств дома', summary:'Основа для напоминаний о сроках годности, оригинальных упаковках, списке лекарств и снижении ошибок домашнего применения.', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11574791/' },

]


const GUIDELINES_DB = [
  {
    id:'WHO_MEC_2025',
    body:'WHO',
    category:'contraception',
    year:2025,
    title:'Medical eligibility criteria for contraceptive use, 6th edition',
    titleRu:'WHO MEC 2025: медицинские критерии приемлемости контрацепции',
    summary:'Глобальная рамка безопасности контрацепции при разных состояниях и характеристиках пользователя. В Elara используется для предупреждений и маршрутизации к врачу, а не для назначения метода.',
    url:'https://www.who.int/publications/i/item/9789240115583',
    tags:['contraception','who','mec','safety'],
  },
  {
    id:'CDC_US_MEC_2024',
    body:'CDC',
    category:'contraception',
    year:2024,
    title:'U.S. Medical Eligibility Criteria for Contraceptive Use, 2024',
    titleRu:'CDC U.S. MEC 2024: критерии безопасности контрацепции',
    summary:'Прикладная таблица по совместимости методов контрацепции с заболеваниями и факторами риска. В Elara это слой safety-check, а не автоматическое назначение.',
    url:'https://www.cdc.gov/contraception/hcp/usmec/index.html',
    tags:['contraception','cdc','us-mec','safety'],
  },
  {
    id:'CDC_US_SPR_2024',
    body:'CDC',
    category:'contraception',
    year:2024,
    title:'U.S. Selected Practice Recommendations for Contraceptive Use, 2024',
    titleRu:'CDC U.S. SPR 2024: практические рекомендации по контрацепции',
    summary:'Практические сценарии: старт метода, пропуски, побочные эффекты, барьеры доступа. В Elara подходит для чек-листов и подсказок “что обсудить с врачом”.',
    url:'https://www.cdc.gov/mmwr/volumes/73/rr/rr7303a1.htm',
    tags:['contraception','cdc','us-spr','practice'],
  },
  {
    id:'NICE_NG87_ADHD',
    body:'NICE',
    category:'mental',
    year:2018,
    title:'Attention deficit hyperactivity disorder: diagnosis and management',
    titleRu:'NICE NG87: СДВГ - диагностика и ведение',
    summary:'Подходит для AI-триажа СДВГ: когда предлагать ASRS, какие данные собрать, когда рекомендовать специалиста. Не заменяет клиническую диагностику.',
    url:'https://www.nice.org.uk/guidance/ng87',
    tags:['adhd','nice','triage'],
  },
  {
    id:'NICE_CG78_BPD',
    body:'NICE',
    category:'mental',
    year:2009,
    title:'Borderline personality disorder: recognition and management',
    titleRu:'NICE CG78: ПРЛ - распознавание и ведение',
    summary:'Рамка для осторожных вопросов при эмоциональной нестабильности, страхе отвержения и самоповреждении. Нужна, чтобы AI не путал ПРЛ с СДВГ или БАР.',
    url:'https://www.nice.org.uk/guidance/cg78',
    tags:['bpd','nice','triage'],
  },
  {
    id:'NICE_CG142_AUTISM',
    body:'NICE',
    category:'mental',
    year:2012,
    title:'Autism spectrum disorder in adults: diagnosis and management',
    titleRu:'NICE CG142: РАС у взрослых - диагностика и ведение',
    summary:'Используется для маршрутизации при аутистических чертах: сенсорика, социальная нагрузка, маскинг, потребность в структурной поддержке.',
    url:'https://www.nice.org.uk/guidance/cg142',
    tags:['autism','nice','adults'],
  },
  {
    id:'NICE_NG23_MENOPAUSE',
    body:'NICE',
    category:'menopause',
    year:2024,
    title:'Menopause: identification and management',
    titleRu:'NICE NG23: менопауза - распознавание и ведение',
    summary:'Клинический путь для симптомов менопаузы, МГТ, рисков и коммуникации с врачом. В Elara не должен превращаться в “МГТ всем”.',
    url:'https://www.nice.org.uk/guidance/ng23',
    tags:['menopause','nice','mht'],
  },
  {
    id:'CDC_ADULT_IMMUNIZATION_SCHEDULE',
    body:'CDC',
    category:'vaccines',
    year:2025,
    title:'Adult Immunization Schedule by Age',
    titleRu:'CDC: календарь вакцинации взрослых по возрасту',
    summary:'Используется для safety-логики прививок взрослых: Td/Tdap, HPV 27-45 по shared decision-making, HepB, пневмококк, RZV и другие возрастные/рисковые рекомендации.',
    url:'https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html',
    tags:['cdc','vaccines','adult-schedule'],
  },
  {
    id:'CDC_CHILD_IMMUNIZATION_SCHEDULE',
    body:'CDC',
    category:'vaccines',
    year:2025,
    title:'Child and Adolescent Immunization Schedule',
    titleRu:'CDC: календарь вакцинации детей и подростков',
    summary:'Используется для детского/родительского чек-листа: младенцы, дети, подростки, catch-up и возрастные окна вакцинации.',
    url:'https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-age.html',
    tags:['cdc','vaccines','children','teens'],
  },
  {
    id:'WPATH_SOC8',
    body:'WPATH',
    category:'gender',
    year:2022,
    title:'Standards of Care for the Health of Transgender and Gender Diverse People, Version 8',
    titleRu:'WPATH SOC8: стандарты помощи трансгендерным и гендерно разнообразным людям',
    summary:'Ключевой стандарт по гендерно-утверждающей помощи. В Elara используется для терминологии, safety-рамок и напоминаний о мониторинге, но не для самостоятельной смены терапии.',
    url:'https://wpath.org/publications/soc8/',
    tags:['wpath','soc8','gaht','trans'],
  },
  {
    id:'IFRC_FIRST_AID_GUIDELINES_2020',
    body:'IFRC',
    category:'first_aid',
    year:2020,
    title:'International first aid, resuscitation, and education guidelines 2020',
    titleRu:'IFRC 2020: международные рекомендации по первой помощи и обучению',
    summary:'Практическая рамка для первой помощи и обучения непрофессионалов: алгоритмы, безопасность, обучение и поведение свидетеля.',
    url:'https://www.globalfirstaidcentre.org/first-aid-guidelines-2020/',
    tags:['first-aid','education','ifrc'],
  },
  {
    id:'CDC_EMERGENCY_SUPPLIES',
    body:'CDC',
    category:'first_aid_kit',
    year:2025,
    title:'Emergency supplies and preparedness',
    titleRu:'CDC: наборы экстренной готовности и домашние запасы',
    summary:'Источник для логики домашней аптечки, личных лекарств, контактов, документов и регулярного обновления запасов.',
    url:'https://www.cdc.gov/emergency-preparedness/emergency-supplies/index.html',
    tags:['cdc','preparedness','first-aid-kit'],
  },

]

const SOURCE_TABS = [
  { key:'research', ru:'PubMed / PMC', en:'PubMed / PMC', emoji:'🔬' },
  { key:'guidelines', ru:'Гайдлайны', en:'Guidelines', emoji:'🧭' },
]

const CATEGORIES = [
  { key:'all', ru:'Все', en:'All', emoji:'📚' },
  { key:'cycle', ru:'Цикл', en:'Cycle', emoji:'🩸' },
  { key:'brain', ru:'Психика и мозг', en:'Mind & brain', emoji:'🧠' },
  { key:'medications', ru:'Лекарства', en:'Medications', emoji:'💊' },
  { key:'diseases', ru:'Заболевания', en:'Conditions', emoji:'🏥' },
  { key:'intimate', ru:'Интим и пары', en:'Intimacy', emoji:'🌹' },
  { key:'pregnancy', ru:'Беременность', en:'Pregnancy', emoji:'🤰' },
  { key:'postpartum', ru:'После родов', en:'Postpartum', emoji:'👶' },
  { key:'menopause', ru:'Менопауза', en:'Menopause', emoji:'🌙' },
  { key:'male', ru:'Мужское', en:'Male health', emoji:'💪' },
  { key:'trans', ru:'ГАТ / ЗГТ', en:'GAHT', emoji:'🌈' },
  { key:'health', ru:'Общее здоровье', en:'General health', emoji:'⚕️' },
  { key:'nutrition', ru:'Питание', en:'Nutrition', emoji:'🥗' },
  { key:'teen', ru:'Подростки', en:'Teens', emoji:'🌱' },
  { key:'vaccines', ru:'Прививки', en:'Vaccines', emoji:'💉' },
  { key:'first_aid', ru:'Первая помощь', en:'First aid', emoji:'🆘' },
  { key:'first_aid_kit', ru:'Аптечка', en:'First-aid kit', emoji:'🧰' },
]

const GUIDELINE_CATEGORIES = [
  { key:'all', ru:'Все', en:'All', emoji:'📚' },
  { key:'contraception', ru:'Контрацепция', en:'Contraception', emoji:'🛡️' },
  { key:'mental', ru:'Психика', en:'Mental health', emoji:'🧠' },
  { key:'menopause', ru:'Менопауза', en:'Menopause', emoji:'🌙' },
  { key:'gender', ru:'ГАТ / ЗГТ', en:'GAHT', emoji:'🌈' },
  { key:'vaccines', ru:'Прививки', en:'Vaccines', emoji:'💉' },
  { key:'first_aid', ru:'Первая помощь', en:'First aid', emoji:'🆘' },
  { key:'first_aid_kit', ru:'Аптечка', en:'First-aid kit', emoji:'🧰' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))
const GUIDELINE_CATEGORY_MAP = Object.fromEntries(GUIDELINE_CATEGORIES.map((c) => [c.key, c]))

function getSourceLabel(item) {
  if (item.body) return item.body
  if (item.id?.startsWith('PMC')) return 'PMC'
  if (item.id?.startsWith('PMID')) return 'PubMed'
  return 'Source'
}

export default function ResearchPage() {
  const { lang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const [sourceTab, setSourceTab] = useState('research')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const activeDb = sourceTab === 'guidelines' ? GUIDELINES_DB : RESEARCH_DB
  const activeCategories = sourceTab === 'guidelines' ? GUIDELINE_CATEGORIES : CATEGORIES
  const activeCategoryMap = sourceTab === 'guidelines' ? GUIDELINE_CATEGORY_MAP : CATEGORY_MAP

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activeDb.filter((item) => {
      const inCategory = category === 'all' || item.category === category
      if (!inCategory) return false
      if (!q) return true
      return [item.title, item.titleRu, item.summary, item.body, ...(item.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    }).sort((a, b) => b.year - a.year)
  }, [activeDb, category, search])

  function switchSource(next) {
    setSourceTab(next)
    setCategory('all')
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <div style={{ padding:'20px 16px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
        <h2 style={{ fontSize:26, marginBottom:8 }}>📚 {rl('Научная база','Research base')}</h2>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:12, lineHeight:1.5 }}>
          {sourceTab === 'research'
            ? rl(`${RESEARCH_DB.length} PubMed/PMC источников - доказательная база Elara`, `${RESEARCH_DB.length} PubMed/PMC sources - Elara's evidence base`)
            : rl(`${GUIDELINES_DB.length} клинических гайдлайнов - safety-логика Elara`, `${GUIDELINES_DB.length} clinical guidelines - Elara's safety logic`)}
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          {SOURCE_TABS.map((tab) => {
            const active = tab.key === sourceTab
            return (
              <button
                key={tab.key}
                onClick={() => switchSource(tab.key)}
                style={{
                  padding:'9px 10px', borderRadius:12, cursor:'pointer', fontSize:13,
                  border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--bg)',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {tab.emoji} {lang === 'en' ? tab.en : tab.ru}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.55, padding:'10px 12px', borderRadius:12, background:'var(--bg)', border:'1px solid var(--border)', marginBottom:12 }}>
          {sourceTab === 'research'
            ? rl('Здесь только PubMed / MEDLINE и PMC: исследования, метаанализы, валидация шкал. Это объясняет, почему Elara считает именно так.', 'Only PubMed / MEDLINE and PMC here: studies, meta-analyses, scale validation. This explains why Elara calculates things this way.')
            : rl('Здесь WHO, CDC, NICE и WPATH: не “исследования”, а клинические правила безопасности. Они задают границы: что показывать, когда предупреждать и когда отправлять к врачу.', 'WHO, CDC, NICE and WPATH live here: not studies, but clinical safety guidance. They set boundaries: what to show, when to warn, and when to suggest seeing a clinician.')}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={rl('Поиск по теме...','Search by topic...')}
          style={{ marginBottom:12 }}
        />

        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {activeCategories.map((cat) => {
            const active = cat.key === category
            return (
              <button
                key={`${sourceTab}-${cat.key}`}
                onClick={() => setCategory(cat.key)}
                style={{
                  padding:'7px 12px', borderRadius:999, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
                  border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--bg)',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}
              >
                {cat.emoji} {lang === 'en' ? cat.en : cat.ru}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex:1, padding:'12px 16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.length === 0 && (
          <p style={{ color:'var(--text3)', fontSize:13, textAlign:'center', marginTop:30 }}>
            {rl('Ничего не найдено','Nothing found')}
          </p>
        )}

        {filtered.map((r) => {
          const categoryMeta = activeCategoryMap[r.category]
          return (
            <div key={`${sourceTab}-${r.id}`} className="card" style={{ padding:'14px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', lineHeight:1.45 }}>{r.titleRu}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, lineHeight:1.45 }}>{r.title} · {r.year}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
                  <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', border:'1px solid var(--accent)33' }}>
                    {getSourceLabel(r)}
                  </span>
                  {categoryMeta && (
                    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'var(--bg3)', color:'var(--text3)', border:'1px solid var(--border)' }}>
                      {categoryMeta.emoji} {lang === 'en' ? categoryMeta.en : categoryMeta.ru}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:'0 0 10px' }}>{r.summary}</p>

              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {(r.tags || []).slice(0, 5).map((tag) => (
                  <span key={`${r.id}-${tag}`} style={{ fontSize:10, padding:'3px 7px', borderRadius:999, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text3)' }}>
                    #{tag}
                  </span>
                ))}
              </div>

              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--accent)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid var(--accent)33', background:'var(--accent-soft)' }}>
                🔗 {getSourceLabel(r)} · {rl('Открыть источник','Open source')}
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
