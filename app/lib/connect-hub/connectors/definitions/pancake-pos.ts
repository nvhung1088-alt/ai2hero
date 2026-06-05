import { ConnectorDefinition } from '../types';

export const pancakePosConnector: ConnectorDefinition = {
  slug: 'pancake-pos',
  name: 'Pancake POS',
  icon: 'Store',
  category: 'pos',
  description: 'Quản lý kho, khách hàng và đơn hàng qua nền tảng Pancake POS (pos.pancake.vn).',
  authType: 'api_key',
  authFields: [
    { name: 'shopId', label: 'Shop ID', type: 'text', required: true, placeholder: 'vd: 987654321' },
    { name: 'apiKey', label: 'API Key (Shop Token)', type: 'password', required: true, secret: true },
  ],
  actions: [
    // Nhóm Báo cáo & Thống kê (3)
    {
      slug: 'get_statistics',
      name: 'Thống kê doanh số',
      description: 'Báo cáo tổng hợp: doanh số gốc, số đơn chốt, tiền thực thu, lợi nhuận, giá trị trung bình đơn hàng.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'groupBy', label: 'Nhóm theo', type: 'select', required: false, options: ['date', 'status', 'source'] }
      ],
      outputFields: ['sales', 'orders', 'revenue', 'profit', 'aov'],
      aiInstruction: 'Bước 1: Lấy khoảng thời gian startDate và endDate.\nBước 2: Gọi Action get_statistics.\nBước 3: Hiển thị bảng doanh thu, số đơn, tiền thu hộ và lợi nhuận.\nBước 4: Nhấn mạnh vào lợi nhuận và doanh số bán được.',
      testStrategy: 'direct'
    },
    {
      slug: 'revenue_summary',
      name: 'Tổng hợp doanh thu nhanh',
      description: 'Lấy nhanh doanh thu thực tế (COD, Prepaid) trực tiếp từ bộ tổng hợp Pancake POS.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['totalRevenue', 'codAmount', 'prepaidAmount'],
      aiInstruction: 'Bước 1: Lấy khoảng thời gian startDate và endDate.\nBước 2: Gọi Action revenue_summary.\nBước 3: Tổng hợp doanh thu, phân chia rõ số thu hộ (COD) và chuyển khoản.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_top_orders',
      name: 'Top đơn hàng giá trị cao',
      description: 'Danh sách các đơn hàng đã xác nhận có giá trị cao nhất trong khoảng thời gian.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'limit', label: 'Số lượng đơn', type: 'text', required: false, placeholder: 'Mặc định là 5' }
      ],
      outputFields: ['orders'],
      aiInstruction: 'Bước 1: Khai báo startDate, endDate và số lượng đơn limit.\nBước 2: Gọi Action get_top_orders.\nBước 3: In ra danh sách top các đơn có giá trị lớn nhất theo thứ tự giảm dần.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_channel',
      name: 'Doanh số theo Nguồn bán (Sàn TMĐT)',
      description: 'Lấy thống kê doanh thu và số lượng đơn hàng chia theo từng Nguồn đơn. (Sử dụng Endpoint siêu tốc)',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['channels'],
      aiInstruction: 'Bước 1: Lấy khoảng thời gian startDate và endDate.\nBước 2: Gọi Action get_sales_by_channel.\nBước 3: Hiển thị bảng doanh thu, số lượng đơn chốt theo từng Nguồn bán / Sàn TMĐT.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_employee',
      name: 'Doanh số theo Nhân viên',
      description: 'Lấy thống kê doanh thu bán hàng được chốt bởi từng nhân viên (Dữ liệu trả về ID nhân viên). (Sử dụng Endpoint siêu tốc)',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['employees'],
      aiInstruction: 'Bước 1: Lấy khoảng thời gian startDate và endDate.\nBước 2: Gọi Action get_sales_by_employee.\nBước 3: Tổng hợp doanh thu, nhóm các đơn tự động vào nhân viên "Hệ thống".',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_status',
      name: 'Tỷ trọng theo Trạng thái',
      description: 'Thống kê số lượng đơn và doanh thu theo các trạng thái (Mới, Đang giao, Đã hoàn thành, Đã hủy, Chuyển hoàn...). (Sử dụng Endpoint siêu tốc)',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders/statistics',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Sử dụng data trả về để đánh giá tỉ lệ đơn hoàn, hủy và các đơn thành công.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_date',
      name: 'Biểu đồ Doanh thu (Theo ngày)',
      description: 'Lấy dữ liệu doanh thu biến động theo từng ngày trong kỳ để vẽ biểu đồ Trendline. (Sử dụng Endpoint siêu tốc)',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders/statistics',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Sử dụng mảng by_date để nhận định xu hướng tăng/giảm doanh thu.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_partner',
      name: 'Doanh số theo Đơn vị VC',
      description: 'Thống kê tỷ trọng đơn hàng và doanh thu theo các Đơn vị vận chuyển (GHTK, J&T...). (Sử dụng Endpoint siêu tốc)',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: '/orders/statistics',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: true, placeholder: 'YYYY-MM-DD' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Phân tích hãng vận chuyển nào đang chiếm đa số đơn hàng của shop.',
      testStrategy: 'direct'
    },

    // Nhóm Đơn hàng (2)
    {
      slug: 'list_orders',
      name: 'Danh sách đơn hàng',
      description: 'Lấy danh sách đơn hàng có bộ lọc phân trang, tìm kiếm, khoảng thời gian và trạng thái.',
      group: 'Đơn hàng',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        { name: 'startDate', label: 'Từ ngày', type: 'date', required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'Đến ngày', type: 'date', required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'page_number', label: 'Số trang', type: 'text', required: false, placeholder: 'Mặc định là 1' },
        { name: 'page_size', label: 'Số lượng / trang', type: 'text', required: false, placeholder: 'Mặc định là 30 (Tối đa 200)' },
        { name: 'search', label: 'Tìm kiếm nhanh', type: 'text', required: false, placeholder: 'Tên KH, SĐT, Mã đơn...' },
        { name: 'updateStatus', label: 'Lọc theo thời gian', type: 'select', required: false, options: ['inserted_at', 'updated_at', 'paid_at', 'partner_inserted_at'] },
        { name: 'option_sort', label: 'Sắp xếp', type: 'select', required: false, options: ['inserted_at_desc', 'inserted_at_asc', 'order_valuation_desc', 'order_valuation_asc'] }
      ],
      outputFields: ['data', 'total_entries', 'total_pages'],
      aiInstruction: 'Bước 1: Gọi Action list_orders với các tham số tương ứng.\nBước 2: Quét qua mảng data trả về (Lưu ý: Dữ liệu cá nhân khách hàng đã được che giấu).\nBước 3: Hiển thị danh sách ID đơn hàng và thông tin cơ bản.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_order',
      name: 'Chi tiết đơn hàng',
      description: 'Lấy thông tin chi tiết của một đơn hàng cụ thể theo ID.',
      group: 'Đơn hàng',
      httpMethod: 'GET',
      endpoint: '/orders/{orderId}',
      status: 'ready',
      inputSchema: [
        { name: 'orderId', label: 'Mã ID đơn hàng', type: 'text', required: true, placeholder: 'Mã ID trên Pancake POS' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Nhận ID đơn hàng cần xem.\nBước 2: Gọi Action get_order với orderId.\nBước 3: Thông tin cá nhân khách hàng ở tác vụ này không bị che giấu. Phân tích trạng thái đơn và giá trị đơn hàng.',
      testStrategy: 'requires_sample',
      sampleFrom: { actionSlug: 'list_orders', path: 'data[0].id', inputKey: 'orderId' }
    },

    // Nhóm Sản phẩm (2)
    {
      slug: 'list_products',
      name: 'Danh sách sản phẩm',
      description: 'Truy vấn danh mục sản phẩm của cửa hàng kèm bộ lọc tìm kiếm và phân trang.',
      group: 'Sản phẩm',
      httpMethod: 'GET',
      endpoint: '/products',
      status: 'ready',
      inputSchema: [
        { name: 'page_number', label: 'Số trang', type: 'text', required: false, placeholder: 'Mặc định là 1' },
        { name: 'page_size', label: 'Số lượng / trang', type: 'text', required: false, placeholder: 'Mặc định là 30' },
        { name: 'search', label: 'Tìm kiếm sản phẩm', type: 'text', required: false, placeholder: 'Tên, mã SKU, barcode...' },
        { name: 'warehouse_id', label: 'Kho hàng ID', type: 'text', required: false, placeholder: 'Lọc theo kho hàng cụ thể' }
      ],
      outputFields: ['data', 'total_entries', 'total_pages'],
      aiInstruction: 'Bước 1: Gọi Action list_products.\nBước 2: Duyệt danh sách data trả về để lấy thông tin sản phẩm: Tên, giá bán, số lượng.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_product',
      name: 'Chi tiết sản phẩm',
      description: 'Xem thông tin chi tiết sản phẩm và các biến thể kích thước, màu sắc của nó.',
      group: 'Sản phẩm',
      httpMethod: 'GET',
      endpoint: '/products/{productId}',
      status: 'ready',
      inputSchema: [
        { name: 'productId', label: 'Mã ID sản phẩm', type: 'text', required: true, placeholder: 'Mã ID sản phẩm' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Gọi Action get_product.\nBước 2: Xem chi tiết các biến thể (variation) để tư vấn khách hàng chính xác nhất.',
      testStrategy: 'requires_sample',
      sampleFrom: { actionSlug: 'list_products', path: 'data[0].id', inputKey: 'productId' }
    },

    // Nhóm Khách hàng CRM (2)
    {
      slug: 'list_customers',
      name: 'Danh sách khách hàng',
      description: 'Lấy danh sách danh bạ CRM khách hàng đã từng mua sắm tại cửa hàng.',
      group: 'Khách hàng CRM',
      httpMethod: 'GET',
      endpoint: '/customers',
      status: 'ready',
      inputSchema: [
        { name: 'page_number', label: 'Số trang', type: 'text', required: false, placeholder: 'Mặc định là 1' },
        { name: 'page_size', label: 'Số lượng / trang', type: 'text', required: false, placeholder: 'Mặc định là 30' },
        { name: 'search', label: 'Tìm kiếm khách hàng', type: 'text', required: false, placeholder: 'Tên, SĐT, Email...' }
      ],
      outputFields: ['data', 'total_entries', 'total_pages'],
      aiInstruction: 'Bước 1: Gọi Action list_customers.\nBước 2: Dữ liệu cá nhân khách hàng ở danh sách hàng loạt đã được che dấu. Phân tích các ID khách hàng.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_customer',
      name: 'Chi tiết khách hàng',
      description: 'Lấy hồ sơ mua sắm chi tiết, lịch sử điểm thưởng, công nợ của một khách hàng.',
      group: 'Khách hàng CRM',
      httpMethod: 'GET',
      endpoint: '/customers/{customerId}',
      status: 'ready',
      inputSchema: [
        { name: 'customerId', label: 'Mã ID khách hàng', type: 'text', required: true, placeholder: 'Mã ID khách hàng' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Nhận customerId.\nBước 2: Gọi Action get_customer.\nBước 3: Xem đầy đủ lịch sử mua sắm và thông tin bảo mật đầy đủ (không bị che).',
      testStrategy: 'requires_sample',
      sampleFrom: { actionSlug: 'list_customers', path: 'data[0].id', inputKey: 'customerId' }
    },

    // Nhóm Kho hàng & Tồn kho (2)
    {
      slug: 'list_warehouses',
      name: 'Danh sách kho hàng',
      description: 'Lấy danh sách các kho hàng vật lý đã cấu hình trên Pancake POS.',
      group: 'Kho hàng & Tồn kho',
      httpMethod: 'GET',
      endpoint: '/warehouses',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Gọi Action list_warehouses.\nBước 2: Lấy thông tin và ID của kho hàng phục vụ tra cứu hàng tồn.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_inventory',
      name: 'Báo cáo tồn kho',
      description: 'Truy xuất báo cáo tồn kho hiện tại của các sản phẩm.',
      group: 'Kho hàng & Tồn kho',
      httpMethod: 'GET',
      endpoint: '/inventory-report',
      status: 'ready',
      inputSchema: [
        { name: 'warehouse_ids', label: 'Danh sách kho hàng ID', type: 'text', required: false, placeholder: 'Mã ID kho (cách nhau bởi dấu phẩy)' },
        { name: 'category_ids', label: 'Danh sách danh mục ID', type: 'text', required: false, placeholder: 'Mã ID danh mục (cách nhau bởi dấu phẩy)' }
      ],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Gọi Action get_inventory.\nBước 2: Nếu có lỗi (như gói API không hỗ trợ), thông báo cho người dùng và dùng list_products làm phương án thay thế.',
      testStrategy: 'direct'
    },

    // Tiện ích & Hỗ trợ (2)
    {
      slug: 'get_shop_info',
      name: 'Thông tin cửa hàng',
      description: 'Lấy thông tin tên cửa hàng, số điện thoại và địa chỉ cấu hình chính của POS.',
      group: 'Tiện ích & Hỗ trợ',
      httpMethod: 'GET',
      endpoint: '/shop',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Gọi Action get_shop_info.\nBước 2: Trả về ID và tên Shop. Action này tự động lấy thông tin an toàn dù bị chặn quyền.',
      testStrategy: 'direct'
    },
    {
      slug: 'probe_sample_data',
      name: 'Dò cấu trúc dữ liệu',
      description: 'Dò nhanh cấu trúc dữ liệu mẫu của Đơn hàng, Sản phẩm, Khách hàng để thiết lập ánh xạ.',
      group: 'Tiện ích & Hỗ trợ',
      httpMethod: 'GET',
      endpoint: '/probe',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data'],
      aiInstruction: 'Bước 1: Gọi Action probe_sample_data.\nBước 2: Hệ thống tự động fetch 1 record của order, product và customer để làm chuẩn tham chiếu cấu trúc.',
      testStrategy: 'direct'
    },

  ],
  setupGuide: '<p><b>1.</b> Đăng nhập vào <a href="https://pos.pancake.vn" target="_blank" rel="noreferrer">Pancake POS</a>.</p><p><b>2.</b> Chọn Cửa hàng. Sao chép <b>Shop ID</b> từ URL (ví dụ: <code>shops/987654321</code>).</p><p><b>3.</b> Truy cập <b>Cài đặt &gt; Tích hợp API</b> và tạo một <b>API Key</b> (Shop Token) mới.</p>'
};
